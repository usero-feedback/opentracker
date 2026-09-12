import { Check, Loader, X } from 'lucide-react'
import * as React from 'react'
import { useSpinDelay } from 'spin-delay'
import { cn } from '../lib/utils.js'

import { useFetcher } from 'react-router'
import { Button, ButtonProps } from './ui/button.js'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip.js'

type Status = 'pending' | 'success' | 'error' | 'idle' | 'loading' | 'submitting'
export const StatusButton = React.forwardRef<
	HTMLButtonElement,
	ButtonProps & {
		status: Status
		message?: string | null
		spinDelay?: Parameters<typeof useSpinDelay>[1]
	}
>(({ message, status, className, children, spinDelay, ...props }, ref) => {
	const delayedPending = useSpinDelay(status === 'pending' || status === 'loading' || status === 'submitting', {
		delay: 100,
		minDuration: 100,
		...spinDelay,
	})
	const loadingCompanion = delayedPending ? (
		<div className='inline-flex h-6 w-6 items-center justify-center'>
			<Loader className='animate-spin' />
		</div>
	) : null
	const companion = {
		pending: loadingCompanion,
		loading: loadingCompanion,
		submitting: loadingCompanion,
		success: (
			<div className='inline-flex h-6 w-6 items-center justify-center'>
				<Check />
			</div>
		),
		error: (
			<div className='inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive'>
				<X className='text-destructive-foreground' />
			</div>
		),
		idle: null,
	}[status]

	return (
		<Button ref={ref} className={cn('flex justify-center gap-4', className)} {...props}>
			{/* inline-flex keeps an icon child on the same line as the label (preflight makes svg display:block) */}
			<span className='inline-flex items-center gap-2'>{children}</span>
			{message ? (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger>{companion}</TooltipTrigger>
						<TooltipContent>{message}</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			) : (
				companion
			)}
		</Button>
	)
})
StatusButton.displayName = 'StatusButton'

export function statusButtonStatus(status: ReturnType<typeof useFetcher>['state']): Status {
	switch (status) {
		case 'loading':
			return 'pending'
		case 'idle':
			return 'idle'
		case 'submitting':
			return 'submitting'
	}
}
