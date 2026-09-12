// In-memory sliding window, per Worker isolate. Enough to stop a runaway agent loop hammering D1.

export const MCP_TOOL_CALLS_PER_MINUTE = 120
const WINDOW_MS = 60_000

const windows = new Map<string, number[]>()

export type RateLimitVerdict = { allowed: true } | { allowed: false; retryAfterSeconds: number }

export function checkRateLimit(key: string, limit: number, now: number = Date.now()): RateLimitVerdict {
	const cutoff = now - WINDOW_MS
	const recent = (windows.get(key) ?? []).filter(ts => ts > cutoff)
	if (recent.length >= limit) {
		windows.set(key, recent)
		return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000)) }
	}
	recent.push(now)
	windows.set(key, recent)
	if (windows.size > 5000) {
		for (const [k, stamps] of windows) {
			if (stamps.every(ts => ts <= cutoff)) windows.delete(k)
		}
	}
	return { allowed: true }
}

export function checkToolCallRateLimit(key: string, now: number = Date.now()): RateLimitVerdict {
	return checkRateLimit(key, MCP_TOOL_CALLS_PER_MINUTE, now)
}

/** Test hook. */
export function resetToolCallRateLimit(): void {
	windows.clear()
}
