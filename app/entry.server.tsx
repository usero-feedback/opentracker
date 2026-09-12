import { isbot } from 'isbot'
import { renderToReadableStream } from 'react-dom/server'
import type { AppLoadContext, EntryContext, HandleErrorFunction } from 'react-router'
import { ServerRouter } from 'react-router'
import { contextToBackendConfig } from '~/utils/backendConfig'
import { errorToString, is404 } from '~/utils/errorToString'
import { sendToSentry } from '~/utils/sentryUtils'

export default async function handleRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	routerContext: EntryContext,
	loadContext: AppLoadContext,
) {
	const backendConfig = contextToBackendConfig(loadContext)

	// Monkey-patch console.error to capture in Sentry via HTTP API
	const sentryDsn = backendConfig.sentryDsn
	if (sentryDsn) {
		const originalConsoleError = console.error
		console.error = (...args) => {
			originalConsoleError(...args)
			sendToSentry(args, sentryDsn)
		}
	}

	let shellRendered = false
	const userAgent = request.headers.get('user-agent')

	const body = await renderToReadableStream(<ServerRouter context={routerContext} url={request.url} />, {
		onError(error: unknown) {
			responseStatusCode = 500
			// Log streaming rendering errors from inside the shell.  Don't log
			// errors encountered during initial shell rendering since they'll
			// reject and get logged in handleDocumentRequest.
			if (shellRendered) {
				console.error(error)
			}
		},
	})
	shellRendered = true

	// Ensure requests from bots and SPA Mode renders wait for all content to load before responding
	// https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
	if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
		await body.allReady
	}

	responseHeaders.set('Content-Type', 'text/html')
	return new Response(body, {
		headers: responseHeaders,
		status: responseStatusCode,
	})
}

export const handleError: HandleErrorFunction = (error, { request, context }: { request: Request; context: AppLoadContext }) => {
	const backendConfig = contextToBackendConfig(context)

	// React Router may abort some interrupted requests, don't log those
	if (request.signal.aborted) {
		return
	}

	// Skip excluded errors (e.g., 404s for unmatched routes from bots)
	if (shouldExcludeFromSentry(error, request)) {
		return
	}

	// Log the error
	console.error(error)

	// Send to Sentry using waitUntil to keep worker alive
	if (backendConfig.sentryDsn && context.cloudflare?.ctx?.waitUntil) {
		const sentryPromise = sendToSentry([errorToString(error)], backendConfig.sentryDsn).then(result => {
			if (result.success) {
				console.log(`Sentry: sent (eventId=${result.eventId}, status=${result.status})`)
			} else {
				console.error(`Sentry: failed (error=${result.error}, status=${result.status})`)
			}
		})
		context.cloudflare.ctx.waitUntil(sentryPromise)
	}
}

// Exclusion functions - return true to skip sending to Sentry
const sentryExclusions: Array<(error: unknown, request: Request) => boolean> = [
	// Skip 404s for unmatched routes (eg bots probing for common paths)
	error => is404(error) && errorToString(error).includes('No route matches URL'),
]

function shouldExcludeFromSentry(error: unknown, request: Request): boolean {
	return sentryExclusions.some(fn => fn(error, request))
}
