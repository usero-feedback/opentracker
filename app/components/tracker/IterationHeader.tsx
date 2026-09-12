import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '~/lib/utils'
import { formatIterationDate } from '~/utils/iteration-planning'
import type { IterationGroup } from '~/utils/iteration-planning'

interface IterationHeaderProps {
	iteration: IterationGroup
	isCollapsed?: boolean
	onToggleCollapse?: () => void
}

export function IterationHeader({ iteration, isCollapsed, onToggleCollapse }: IterationHeaderProps) {
	const { isCurrent, startDate, totalPoints, acceptedPoints } = iteration

	// Format: "2 Dec - Current" or "9 Dec"
	const dateLabel = formatIterationDate(startDate)
	const label = isCurrent ? `${dateLabel} - Current` : dateLabel

	// Points display: "Pts: 6 of 10" for current, "Pts: 8" for future
	const pointsLabel = isCurrent ? `Pts: ${acceptedPoints} of ${totalPoints}` : `Pts: ${totalPoints}`

	return (
		<button
			onClick={onToggleCollapse}
			className={cn(
				'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
				'bg-slate-800/90 border-y border-slate-600/50 hover:bg-slate-700/90',
				'sticky top-0 z-10',
			)}
		>
			{/* Collapse indicator */}
			{isCollapsed ? (
				<ChevronRight className='h-3.5 w-3.5 text-slate-400 shrink-0' />
			) : (
				<ChevronDown className='h-3.5 w-3.5 text-slate-400 shrink-0' />
			)}

			{/* Date label */}
			<span className={cn('text-xs font-semibold tracking-wide', isCurrent ? 'text-blue-400' : 'text-slate-400')}>{label}</span>

			<div className='flex-1' />

			{/* Points */}
			<span className='text-xs text-slate-500 font-mono'>{pointsLabel}</span>
		</button>
	)
}
