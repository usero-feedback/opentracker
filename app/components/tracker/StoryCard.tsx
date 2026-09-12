import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlertTriangle, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { useFetcher } from 'react-router'
import { cn } from '~/lib/utils'
import { jsonToFormData } from '~/utils/deserialise'
import type { ReleaseRisk } from '~/utils/iteration-planning'
import { getStateButton, releaseRiskStyles, storyTypeConfig } from './constants'
import { ExpandedStoryDetails } from './ExpandedStoryCard'
import type { Label, Story } from './types'

interface StoryCardProps {
	story: Story
	isSelected?: boolean
	onSelect?: (id: string, multi: boolean) => void
	isExpanded?: boolean
	onExpand?: (storyNumber: number | null) => void
	allLabels?: Label[]
	isDragOverlay?: boolean
	isOptimistic?: boolean
	releaseRisk?: ReleaseRisk
}

export function StoryCard({
	story,
	isSelected,
	onSelect,
	isExpanded,
	onExpand,
	allLabels,
	isDragOverlay,
	isOptimistic,
	releaseRisk,
}: StoryCardProps) {
	const fetcher = useFetcher()
	const [editingTitle, setEditingTitle] = useState(story.title)
	const [isTitleDirty, setIsTitleDirty] = useState(false)
	const config = storyTypeConfig[story.type]
	const Icon = config.icon
	const stateButton = getStateButton(story)

	const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
		id: story.id,
		data: {
			iteration: story.iteration,
			story,
		},
	})

	const style = isDragOverlay ? undefined : { transform: CSS.Transform.toString(transform), transition }

	const handleStateTransition = (action: string) => {
		fetcher.submit(jsonToFormData({ type: 'transition', storyId: story.id, action }), { method: 'POST' })
	}

	const handleCardClick = () => {
		if (!isDragging) {
			if (isExpanded) {
				onExpand?.(null) // Close
			} else {
				onExpand?.(story.number) // Open
				setEditingTitle(story.title)
				setIsTitleDirty(false)
			}
		}
	}

	const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setEditingTitle(e.target.value)
		setIsTitleDirty(true)
	}

	const handleTitleSubmit = () => {
		if (isTitleDirty && editingTitle.trim() !== story.title) {
			fetcher.submit(
				jsonToFormData({
					type: 'update',
					storyId: story.id,
					title: editingTitle.trim(),
					description: story.description,
					storyType: story.type,
					points: story.points?.toString() ?? '',
					deadline: story.deadline ?? '',
				}),
				{ method: 'POST' },
			)
		}
		setIsTitleDirty(false)
	}

	const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleTitleSubmit()
			;(e.target as HTMLTextAreaElement).blur()
		} else if (e.key === 'Escape') {
			e.preventDefault()
			setEditingTitle(story.title)
			setIsTitleDirty(false)
			;(e.target as HTMLTextAreaElement).blur()
		}
	}

	// Issue #10: Keyboard navigation
	const handleKeyDown = (e: React.KeyboardEvent) => {
		// Only handle if the event is on the card itself, not child inputs
		if (e.target !== e.currentTarget) return
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault()
			handleCardClick()
		}
	}

	const isOptimisticUpdate = fetcher.state !== 'idle'

	// Release story styling
	const isRelease = story.type === 'release'
	const riskStyle = isRelease && releaseRisk ? releaseRiskStyles[releaseRisk] : null

	return (
		<div
			ref={isDragOverlay ? undefined : setNodeRef}
			style={style}
			className={cn(
				'group relative border-b select-none transition-colors duration-150 touch-manipulation',
				// Default styling for non-release stories
				!isRelease && 'border-slate-700/50 bg-slate-800/80 hover:bg-slate-700/80',
				// Release story styling based on risk
				isRelease && riskStyle && [riskStyle.bg, riskStyle.border, 'border-l-4'],
				isRelease && !riskStyle && 'bg-blue-900/90 border-blue-700 border-l-4 text-blue-100',
				// Selection state
				isSelected && !isRelease && 'bg-blue-900/30 border-l-2 border-l-blue-400',
				isSelected && isRelease && 'ring-2 ring-white/50',
				// Other states
				isDragging && 'invisible',
				isDragOverlay && 'shadow-2xl ring-2 ring-blue-400',
			)}
			{...(isDragOverlay ? {} : attributes)}
			onClick={handleCardClick}
			onKeyDown={handleKeyDown}
			tabIndex={0}
			role='button'
			aria-label={`Story: ${story.title}`}
		>
			{/* Drag handle - only this area initiates drag */}
			<div
				ref={isDragOverlay ? undefined : setActivatorNodeRef}
				{...(isDragOverlay ? {} : listeners)}
				className='flex items-start gap-2 px-3 py-2 cursor-grab active:cursor-grabbing'
			>
				{/* Story type icon */}
				<div className={cn('mt-0.5 shrink-0', isRelease && riskStyle ? riskStyle.text : config.color)}>
					<Icon className='h-3.5 w-3.5' />
				</div>

				{/* Points badge - spacer kept for releases to align titles */}
				<div
					className={cn(
						'mt-0.5 shrink-0 w-4 h-4 rounded-sm text-[10px] font-bold flex items-center justify-center',
						!isRelease && story.points !== null && 'bg-slate-700 text-slate-300',
					)}
				>
					{!isRelease && story.points}
				</div>

				{/* Story content */}
				<div className='flex-1 min-w-0'>
					{isExpanded && !isDragOverlay ? (
						<textarea
							ref={el => {
								if (el) {
									el.style.height = 'auto'
									el.style.height = el.scrollHeight + 'px'
								}
							}}
							value={editingTitle}
							onChange={handleTitleChange}
							onBlur={handleTitleSubmit}
							onKeyDown={handleTitleKeyDown}
							onClick={e => e.stopPropagation()}
							rows={1}
							className={cn(
								'w-full text-xs leading-normal bg-transparent border border-transparent hover:border-slate-600 focus:border-blue-400 focus:outline-none px-1 py-0.5 rounded resize-none overflow-hidden',
								isRelease && riskStyle ? riskStyle.text : 'text-slate-200',
								isRelease && 'font-semibold',
							)}
							onInput={e => {
								const target = e.target as HTMLTextAreaElement
								target.style.height = 'auto'
								target.style.height = target.scrollHeight + 'px'
							}}
							aria-label='Story title'
						/>
					) : (
						<div
							className={cn(
								'text-xs leading-normal px-1 pt-0.5 pb-1 border border-transparent',
								isRelease && riskStyle ? riskStyle.text : 'text-slate-200',
								isRelease && 'font-semibold',
							)}
						>
							{story.title}
						</div>
					)}
					{/* Deadline for release stories */}
					{isRelease && story.deadline && (
						<div
							className={cn(
								'hidden group-hover:flex items-center gap-1 mt-1 text-xs',
								riskStyle?.text,
								(releaseRisk === 'overdue' || releaseRisk === 'at-risk') && 'font-semibold',
							)}
						>
							{releaseRisk === 'overdue' && <AlertTriangle className='h-3 w-3' />}
							<span>
								Due: {new Date(story.deadline + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
							</span>
							{releaseRisk === 'at-risk' && <span className='uppercase text-[10px] tracking-wide'>At Risk</span>}
							{releaseRisk === 'overdue' && <span className='uppercase text-[10px] tracking-wide'>Overdue</span>}
						</div>
					)}
					{(story.labels.length > 0 || story.commentCount > 0) && (
						<div className='flex flex-wrap items-center gap-1 mt-1'>
							{story.labels.map(label => (
								<span
									key={label.id}
									className={cn('text-xs px-1.5 py-0.5 rounded', isRelease ? 'bg-white/20' : '')}
									style={isRelease ? { color: 'inherit' } : { backgroundColor: label.color + '33', color: label.color }}
								>
									{label.name}
								</span>
							))}
							{story.commentCount > 0 && (
								<span className='inline-flex items-center gap-0.5 text-[10px] text-slate-500 ml-1'>
									<MessageSquare className='h-3 w-3' />
									{story.commentCount}
								</span>
							)}
						</div>
					)}
				</div>

				{/* State buttons */}
				<div className='flex items-center gap-1 shrink-0' onClick={e => e.stopPropagation()}>
					{story.state === 'delivered' ? (
						<>
							<button
								onClick={() => handleStateTransition('accept')}
								disabled={fetcher.state !== 'idle'}
								className='px-3 py-1.5 text-xs font-medium rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors'
								aria-label='Accept story'
							>
								Accept
							</button>
							<button
								onClick={() => handleStateTransition('reject')}
								disabled={fetcher.state !== 'idle'}
								className='px-3 py-1.5 text-xs font-medium rounded bg-red-600 hover:bg-red-500 text-white transition-colors'
								aria-label='Reject story'
							>
								Reject
							</button>
						</>
					) : stateButton ? (
						<button
							onClick={() => handleStateTransition(stateButton.action)}
							disabled={fetcher.state !== 'idle'}
							className={cn(
								'px-3 py-1.5 text-xs font-medium rounded transition-colors',
								stateButton.variant === 'start' && 'bg-slate-600 hover:bg-slate-500 text-white',
								stateButton.variant === 'finish' && 'bg-blue-600 hover:bg-blue-500 text-white',
								stateButton.variant === 'deliver' && 'bg-amber-600 hover:bg-amber-500 text-white',
								stateButton.variant === 'restart' && 'bg-slate-600 hover:bg-slate-500 text-white',
							)}
							aria-label={`${stateButton.label} story`}
						>
							{stateButton.label}
						</button>
					) : null}

					{/* Checkbox for selection - Issue #15: Use onChange instead of onClick with readOnly */}
					<input
						type='checkbox'
						checked={isSelected}
						onChange={() => {
							onSelect?.(story.id, true)
						}}
						onClick={e => e.stopPropagation()}
						className='ml-1 h-3.5 w-3.5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0'
						aria-label='Select story'
					/>
				</div>
			</div>

			{/* Expandable details section */}
			{isExpanded && !isDragOverlay && (
				<div onClick={e => e.stopPropagation()}>
					<ExpandedStoryDetails story={story} allLabels={allLabels ?? []} onClose={() => onExpand?.(null)} />
				</div>
			)}
		</div>
	)
}
