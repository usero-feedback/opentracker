import { useEffect } from 'react'
import { cn } from '~/lib/utils'

interface MobileDrawerProps {
	isOpen: boolean
	onClose: () => void
	children: React.ReactNode
}

export function MobileDrawer({ isOpen, onClose, children }: MobileDrawerProps) {
	// Lock body scroll when drawer is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = ''
		}
		return () => {
			document.body.style.overflow = ''
		}
	}, [isOpen])

	// Close on ESC key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isOpen) {
				onClose()
			}
		}
		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [isOpen, onClose])

	return (
		<>
			{/* Overlay */}
			<div
				className={cn(
					'fixed inset-0 bg-black/60 z-40 transition-opacity duration-200 md:hidden',
					isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
				)}
				onClick={onClose}
				aria-hidden='true'
			/>

			{/* Drawer */}
			<div
				className={cn(
					'fixed left-0 top-0 h-full w-64 z-50 md:hidden',
					'transform transition-transform duration-200 ease-out',
					isOpen ? 'translate-x-0' : '-translate-x-full',
				)}
				role='dialog'
				aria-modal='true'
				aria-label='Navigation drawer'
			>
				{children}
			</div>
		</>
	)
}
