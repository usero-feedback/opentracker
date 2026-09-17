/**
 * Server-side event tracking with multiple consumers
 * - Google Analytics (Measurement Protocol)
 * - Admin email notifications
 */

import type { AppLoadContext } from 'react-router'
import { contextToBackendConfig } from '~/utils/backendConfig'
import { sendEmailViaSES } from '~/utils/email.server'

// Events that trigger admin email notifications
const ADMIN_EMAIL_EVENTS = ['sign_up'] as const

type AdminEmailEvent = (typeof ADMIN_EMAIL_EVENTS)[number]

type EventConsumer = (
	eventName: string,
	params: Record<string, string | number | boolean>,
	request: Request | null,
	context: AppLoadContext,
) => Promise<void>

const consumers: EventConsumer[] = [sendToGA, sendAdminEmail]

/**
 * Track an event with all consumers (GA, admin email, etc.)
 * Uses waitUntil for async/non-blocking execution
 *
 * @param request - Optional request object. Required for GA tracking (to get cookies).
 *                  If null, GA tracking is skipped but other consumers still run.
 */
export function trackEvent(
	eventName: string,
	params: Record<string, string | number | boolean>,
	request: Request | null,
	context: AppLoadContext,
): void {
	try {
		const work = Promise.all(
			consumers.map(consumer =>
				consumer(eventName, params, request, context).catch(error => {
					console.error(`Event consumer error for ${eventName}:`, error)
				}),
			),
		)

		if (context.cloudflare?.ctx?.waitUntil) {
			context.cloudflare.ctx.waitUntil(work)
		} else {
			work.catch(error => {
				console.error('Error in trackEvent:', error)
			})
		}
	} catch (error) {
		console.error('Error in trackEvent:', error)
	}
}

// ============================================================================
// GA Consumer
// ============================================================================

async function sendToGA(
	eventName: string,
	params: Record<string, string | number | boolean>,
	request: Request | null,
	context: AppLoadContext,
): Promise<void> {
	// GA needs request to get cookies - skip if not available
	if (!request) {
		return
	}

	const backendConfig = contextToBackendConfig(context)
	const measurementId = backendConfig.gaId
	const apiSecret = backendConfig.gaSecret

	if (!measurementId || !apiSecret) {
		return
	}

	const { clientId, sessionId } = getGAIdentifiersFromCookie(request, measurementId)
	if (!clientId) {
		return
	}

	const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`

	const payload = {
		client_id: clientId,
		events: [
			{
				name: eventName,
				params: {
					...params,
					...(sessionId && { session_id: sessionId }),
				},
			},
		],
	}

	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	})

	if (!response.ok) {
		console.error('Failed to send GA event:', eventName, await response.text())
	}
}

interface GAIdentifiers {
	clientId: string | undefined
	sessionId: string | undefined
}

export function getGAIdentifiersFromCookie(request: Request, measurementId: string): GAIdentifiers {
	const cookieHeader = request.headers.get('Cookie')
	if (!cookieHeader) return { clientId: undefined, sessionId: undefined }

	const clientMatch = cookieHeader.match(/(?:^|;\s*)_ga=GA\d+\.\d+\.(.+?)(?:;|$)/)
	const clientId = clientMatch?.[1]

	const containerId = measurementId.replace('G-', '')
	const sessionMatch = cookieHeader.match(new RegExp(`(?:^|;\\s*)_ga_${containerId}=GS\\d+\\.\\d+\\.(\\d+)`))
	const sessionId = sessionMatch?.[1]

	return { clientId, sessionId }
}

// ============================================================================
// Admin Email Consumer
// ============================================================================

async function sendAdminEmail(
	eventName: string,
	params: Record<string, string | number | boolean>,
	_request: Request | null,
	context: AppLoadContext,
): Promise<void> {
	if (!ADMIN_EMAIL_EVENTS.includes(eventName as AdminEmailEvent)) {
		return
	}
	// Admin notifications are off until both addresses are configured.
	const { adminEmail, emailFrom } = contextToBackendConfig(context)
	if (!adminEmail || !emailFrom) {
		return
	}

	try {
		const { subject, body } = formatAdminEmail(eventName as AdminEmailEvent, params)

		const success = await sendEmailViaSES(
			{
				to: adminEmail,
				subject,
				html: body,
				text: body.replace(/<[^>]*>/g, ''),
			},
			context,
		)

		if (!success) {
			console.error(`Failed to send admin email for event: ${eventName}`)
		}
	} catch (error) {
		console.error(`Error sending admin email for event ${eventName}:`, error)
	}
}

export function formatAdminEmail(
	eventName: AdminEmailEvent,
	params: Record<string, string | number | boolean>,
): { subject: string; body: string } {
	const timestamp = new Date().toISOString()

	switch (eventName) {
		case 'sign_up': {
			// Fall back to the user id if email is missing so the subject never reads "undefined".
			const identity =
				typeof params.email === 'string' && params.email.length > 0 ? params.email : `user ${params.userId ?? 'unknown'}`
			return {
				subject: `New signup: ${identity}`,
				body: `<p>New user signed up</p><p><strong>Email:</strong> ${identity}</p><p><strong>Time:</strong> ${timestamp}</p>`,
			}
		}

		default: {
			const _exhaustive: never = eventName
			return { subject: `Event: ${eventName}`, body: `<p>Event: ${eventName}</p><pre>${JSON.stringify(params, null, 2)}</pre>` }
		}
	}
}
