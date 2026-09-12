export type FrontendConfig = ReturnType<typeof buildFrontendConfig>

// Will's Usero client id. Self-hosters set USERO_CLIENT_ID to their own, or to '' to hide the widget.
const DEFAULT_USERO_CLIENT_ID = 'client_79f87b29b89b4c76'

export function buildFrontendConfig(varStore: object) {
	return {
		environment: get('ENVIRONMENT', varStore) ?? 'dev',
		gaId: get('GOOGLE_ANALYTICS_ID', varStore),
		useroClientId: useroClientId(varStore),
	}
}

// Unset falls back to the default; an explicit empty string disables the widget.
function useroClientId(varStore: object): string {
	const value: unknown = Reflect.get(varStore, 'USERO_CLIENT_ID')
	return typeof value === 'string' ? value : DEFAULT_USERO_CLIENT_ID
}

// Returns undefined for unset or empty vars.
export function get(key: string, varStore: object): string | undefined {
	const value: unknown = Reflect.get(varStore, key)
	return typeof value === 'string' && value !== '' ? value : undefined
}
