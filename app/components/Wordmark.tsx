import { cn } from '~/lib/utils'

// Text wordmark, replaces the old LeanTracker PNG logo
export function Wordmark({ className }: { className?: string }) {
	return (
		<span className={cn('font-semibold tracking-tight text-white leading-none select-none', className)}>
			<span className='text-white/55'>open</span>tracker
		</span>
	)
}
