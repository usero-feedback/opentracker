export function errorToString(error: unknown): string {
	if (typeof error === 'string') return error
	if (error instanceof Error) return error.message
	const message = messageOf(error)
	if (message !== undefined) return message
	if (typeof error === 'object') return JSON.stringify(error)
	return String(error)
}

export function is404(error: unknown): boolean {
	if (typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number') {
		return error.status === 404
	}
	const message = error instanceof Error ? error.message : messageOf(error)
	return message?.includes('404') ?? false
}

// Plain objects shaped like { message } or { error }, e.g. a parsed JSON error body.
function messageOf(error: unknown): string | undefined {
	if (typeof error !== 'object' || error === null) return undefined
	if ('message' in error && typeof error.message === 'string') return error.message
	if ('error' in error && typeof error.error === 'string') return error.error
	return undefined
}
