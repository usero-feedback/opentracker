import { useEffect } from 'react'

/**
 * Simple keyboard shortcut hook.
 * Ignores keypresses when focus is in input/textarea/contenteditable.
 */
export function useKeyboardShortcut(key: string, callback: () => void) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
				return
			}

			if (e.key.toLowerCase() === key.toLowerCase()) {
				e.preventDefault()
				callback()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [key, callback])
}
