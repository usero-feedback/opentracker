import { errorToString } from '~/utils/errorToString'

export type SentryResult =
	| { success: true; status: number; eventId?: string }
	| { success: false; error: string; status?: number }

// Function to send errors to Sentry via HTTP API
export async function sendToSentry(args: unknown[], dsn: string): Promise<SentryResult> {
	console.log('sending to sentry')
	const message = args.map(errorToString).join(' ')
	const [, projectId] = dsn.match(/\/(\d+)$/) || []
	const [, key] = dsn.match(/\/\/([^@]+)@/) || []

	if (!projectId || !key) {
		return { success: false, error: 'Invalid DSN: could not extract projectId or key' }
	}

	try {
		const response = await fetch(`https://sentry.io/api/${projectId}/store/`, {
			method: 'POST',
			headers: {
				'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${key}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				message,
				level: 'error',
				platform: 'javascript',
				timestamp: new Date().toISOString(),
			}),
		})

		if (response.ok) {
			let eventId: string | undefined
			try {
				const data = (await response.json()) as { id?: string }
				eventId = data.id
			} catch {
				// ignore parse errors
			}
			return { success: true, status: response.status, eventId }
		} else {
			let text = ''
			try {
				text = await response.text()
			} catch {
				// ignore read errors
			}
			return { success: false, error: text || response.statusText, status: response.status }
		}
	} catch (e) {
		return { success: false, error: errorToString(e) }
	}
}
