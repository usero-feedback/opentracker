import { AppLoadContext } from 'react-router'
import { getPrisma } from './db.server'
import { requireApiRateLimit } from './rateLimit.server'

export interface ApiUser {
	id: string
	email: string
	/** The ApiKey row that authenticated this request. */
	apiKey: { id: string; name: string }
}

export const API_KEY_PREFIX = 'lt_'
/** Chars of the plaintext key shown in the UI so a user can tell keys apart. */
const DISPLAY_PREFIX_LENGTH = 12

async function hashApiKey(apiKey: string): Promise<string> {
	const data = new TextEncoder().encode(apiKey)
	const hashBuffer = await crypto.subtle.digest('SHA-256', data)
	return Array.from(new Uint8Array(hashBuffer))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('')
}

/** Resolves "Authorization: Bearer lt_..." to its user, or null. Stamps lastUsedAt without blocking the response. */
export async function getApiUser(request: Request, context: AppLoadContext): Promise<ApiUser | null> {
	const authHeader = request.headers.get('Authorization')
	if (!authHeader) return null

	const parts = authHeader.split(' ')
	if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) return null

	const keyHash = await hashApiKey(parts[1])
	const prisma = getPrisma({ context })

	const key = await prisma.apiKey.findUnique({
		where: { keyHash },
		select: { id: true, name: true, user: { select: { id: true, email: true } } },
	})
	if (!key) return null

	const stamp = prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {})
	if (context.cloudflare?.ctx?.waitUntil) {
		context.cloudflare.ctx.waitUntil(stamp)
	} else {
		await stamp
	}

	return { id: key.user.id, email: key.user.email, apiKey: { id: key.id, name: key.name } }
}

/** Requires a valid API key under its rate limit; throws a 401 or 429 Response otherwise. */
export async function requireApiUser(request: Request, context: AppLoadContext): Promise<ApiUser> {
	const user = await getApiUser(request, context)
	if (!user) {
		throw new Response(JSON.stringify({ error: 'Unauthorized. Provide a valid API key in the Authorization header.' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		})
	}
	requireApiRateLimit(user.apiKey.id)
	return user
}

/** Format: lt_<uuid>. The plaintext is shown once; only the hash and prefix are stored. */
export function generateApiKey(): string {
	return `${API_KEY_PREFIX}${crypto.randomUUID()}`
}

/** Hash + display prefix for a freshly generated key, ready to insert into ApiKey. */
export async function apiKeyStorageFields(apiKey: string): Promise<{ keyHash: string; prefix: string }> {
	return { keyHash: await hashApiKey(apiKey), prefix: apiKey.slice(0, DISPLAY_PREFIX_LENGTH) }
}
