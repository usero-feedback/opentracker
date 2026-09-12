import { AppLoadContext, data } from 'react-router'
import { checkRateLimit, MCP_TOOL_CALLS_PER_MINUTE } from '~/mcp/rateLimit'
import { createStorage, flashToast, getUserSession } from '~/utils/session.server'

// Same in-memory per-isolate window as the MCP limiter; good enough until there's a reason for a Durable Object.
export const AUTH_ATTEMPTS_PER_MINUTE = 10
export const API_REQUESTS_PER_MINUTE = MCP_TOOL_CALLS_PER_MINUTE

const tooManyRequests = (retryAfterSeconds: number) => `Too many requests. Try again in ${retryAfterSeconds}s.`

function clientIp(request: Request): string {
	return request.headers.get('cf-connecting-ip') ?? 'unknown'
}

/** Per-IP limit for login and signup. Returns a 429 (with a toast flashed) once exceeded, otherwise null. */
export async function authRateLimitResponse(request: Request, context: AppLoadContext, scope: 'login' | 'signup') {
	const verdict = checkRateLimit(`${scope}:${clientIp(request)}`, AUTH_ATTEMPTS_PER_MINUTE)
	if (verdict.allowed) return null
	const message = tooManyRequests(verdict.retryAfterSeconds)
	const session = await getUserSession(request, context)
	flashToast(session, { title: message, variant: 'destructive' })
	return data(message, {
		status: 429,
		headers: {
			'Retry-After': String(verdict.retryAfterSeconds),
			'Set-Cookie': await createStorage(context).commitSession(session),
		},
	})
}

/** Per-API-key limit for REST routes. Throws a JSON 429 once exceeded. */
export function requireApiRateLimit(apiKeyId: string): void {
	const verdict = checkRateLimit(`api:${apiKeyId}`, API_REQUESTS_PER_MINUTE)
	if (verdict.allowed) return
	throw new Response(JSON.stringify({ error: tooManyRequests(verdict.retryAfterSeconds) }), {
		status: 429,
		headers: { 'Content-Type': 'application/json', 'Retry-After': String(verdict.retryAfterSeconds) },
	})
}
