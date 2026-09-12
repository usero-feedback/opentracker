/**
 * Google Analytics tracking utilities
 */

declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void
	}
}

/**
 * Set user ID for all subsequent events
 * Call this after login/signup
 */
export function setUserId(userId: string) {
	if (typeof window !== 'undefined' && window.gtag) {
		window.gtag('set', 'user_properties', {
			user_id: userId,
		})
	}
}

/**
 * Clear user ID on logout
 */
export function clearUserId() {
	if (typeof window !== 'undefined' && window.gtag) {
		window.gtag('set', 'user_properties', {
			user_id: null,
		})
	}
}
