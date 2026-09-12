import { useState, useEffect } from 'react'
import { useFetcher } from 'react-router'
import { Plus, X, Link2, Copy, Trash2, User, Calendar, Pencil, Eye } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { Input } from '~/components/ui/input'
import { Markdown } from '~/components/ui/markdown'
import { jsonToFormData } from '~/utils/deserialise'
import { storyTypeConfig, storyStateConfig } from './constants'
import { CommentSection } from './CommentSection'
import type { Story, StoryType, StoryState, Label } from './types'

interface ExpandedStoryDetailsProps {
	story: Story
	allLabels: Label[]
	onClose: () => void
}

export function ExpandedStoryDetails({ story, allLabels, onClose }: ExpandedStoryDetailsProps) {
	const fetcher = useFetcher()
	const deleteFetcher = useFetcher()
	const [description, setDescription] = useState(story.description)
	const [storyType, setStoryType] = useState<StoryType>(story.type)
	const [state, setState] = useState<StoryState>(story.state)
	const [points, setPoints] = useState<string>(story.points?.toString() ?? 'unestimated')
	const [deadline, setDeadline] = useState<string>(story.deadline ?? '')
	const [isDirty, setIsDirty] = useState(false)
	const [isEditingDescription, setIsEditingDescription] = useState(false)

	const config = storyTypeConfig[storyType]
	const Icon = config.icon

	// Available labels (not already on story)
	const availableLabels = allLabels.filter(l => !story.labels.some(sl => sl.id === l.id))

	// CRITICAL FIX: All hooks MUST be called before any conditional returns (Rules of Hooks)
	// Track fetcher completion to reset isDirty and close card on success
	useEffect(() => {
		if (fetcher.state === 'idle' && fetcher.data?.success) {
			setIsDirty(false)
			onClose()
		}
	}, [fetcher.state, fetcher.data, onClose])

	// Sync local state when story prop changes (if not dirty)
	useEffect(() => {
		if (!isDirty) {
			setDescription(story.description)
			setStoryType(story.type)
			setState(story.state)
			setPoints(story.points?.toString() ?? 'unestimated')
			setDeadline(story.deadline ?? '')
		}
	}, [story, isDirty])

	// ESC key to close expanded card
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				// Check for unsaved changes before closing
				if (isDirty && !confirm('You have unsaved changes. Discard them?')) {
					return
				}
				onClose()
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [isDirty, onClose])

	// Hide if delete is pending - MUST be after all hooks
	if (deleteFetcher.state !== 'idle') {
		return null
	}

	const handleSave = () => {
		fetcher.submit(
			jsonToFormData({
				type: 'update',
				storyId: story.id,
				title: story.title,
				description,
				storyType,
				state,
				points: points === 'unestimated' ? '' : points,
				deadline: storyType === 'release' ? deadline : '',
			}),
			{ method: 'POST' },
		)
		// Don't set isDirty(false) here - wait for success in useEffect
	}

	const handleCancel = () => {
		// HIGH PRIORITY FIX #4: Confirm before discarding unsaved changes
		if (isDirty && !confirm('You have unsaved changes. Discard them?')) {
			return
		}
		setDescription(story.description)
		setStoryType(story.type)
		setState(story.state)
		setPoints(story.points?.toString() ?? 'unestimated')
		setDeadline(story.deadline ?? '')
		setIsDirty(false)
		onClose()
	}

	const handleAddLabel = (labelId: string) => {
		fetcher.submit(jsonToFormData({ type: 'addLabel', storyId: story.id, labelId }), { method: 'POST' })
	}

	const handleRemoveLabel = (labelId: string) => {
		fetcher.submit(jsonToFormData({ type: 'removeLabel', storyId: story.id, labelId }), { method: 'POST' })
	}

	const handleDelete = () => {
		if (confirm('Delete this story?')) {
			// CRITICAL FIX #3: Close expanded view BEFORE submitting delete
			onClose()
			deleteFetcher.submit(jsonToFormData({ type: 'delete', storyId: story.id }), { method: 'POST' })
		}
	}

	const markDirty = () => setIsDirty(true)

	return (
		<div>
			<div className='bg-slate-800 border-b border-slate-600 text-slate-200'>
				{/* Action Bar */}
				<div className='flex items-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-900'>
					<Link2 className='h-4 w-4 text-slate-500' />
					<span className='text-xs font-mono text-slate-400 bg-slate-700 border border-slate-700 px-2 py-0.5 rounded'>
						TR-{story.number}
					</span>
					<button
						onClick={() => navigator.clipboard.writeText(`TR-${story.number}`)}
						className='p-2 hover:bg-slate-700 rounded transition-colors'
						title='Copy ID'
						aria-label='Copy story ID'
					>
						<Copy className='h-3.5 w-3.5 text-slate-500' />
					</button>
					<button
						onClick={() => {
							const url = new URL(window.location.href)
							url.searchParams.set('story', story.id)
							navigator.clipboard.writeText(url.toString())
						}}
						className='p-2 hover:bg-slate-700 rounded transition-colors'
						title='Copy link to story'
						aria-label='Copy link to story'
					>
						<Link2 className='h-3.5 w-3.5 text-slate-500' />
					</button>
					<button
						onClick={handleDelete}
						className='p-2 hover:bg-red-100 rounded transition-colors'
						title='Delete'
						aria-label='Delete story'
					>
						<Trash2 className='h-3.5 w-3.5 text-slate-500 hover:text-red-500' />
					</button>
					<div className='flex-1' />
					<button
						onClick={handleCancel}
						className='px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 rounded transition-colors'
					>
						Cancel
					</button>
					<button
						onClick={handleSave}
						disabled={!isDirty}
						className={cn(
							'px-3 py-1 text-xs font-medium rounded transition-colors',
							isDirty ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed',
						)}
					>
						Save
					</button>
				</div>

				{/* Metadata Table */}
				<div className='border-b border-slate-700'>
					{/* Story Type */}
					<div className='flex items-center px-3 py-2 border-b border-slate-700'>
						<span className='w-32 text-xs text-slate-400 uppercase tracking-wide'>Story Type</span>
						<div className='flex items-center gap-2'>
							<div className={config.color}>
								<Icon className='h-4 w-4' />
							</div>
							<Select
								value={storyType}
								onValueChange={v => {
									setStoryType(v as StoryType)
									// Clear points when switching to release (releases don't have points)
									if (v === 'release') {
										setPoints('unestimated')
									}
									markDirty()
								}}
							>
								<SelectTrigger className='h-9 w-28 text-xs bg-slate-700 border-slate-700'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='feature'>Feature</SelectItem>
									<SelectItem value='bug'>Bug</SelectItem>
									<SelectItem value='chore'>Chore</SelectItem>
									<SelectItem value='release'>Release</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Points - not shown for releases */}
					{storyType !== 'release' && (
						<div className='flex items-center px-3 py-2 border-b border-slate-700'>
							<span className='w-32 text-xs text-slate-400 uppercase tracking-wide'>Points</span>
							<Select
								value={points}
								onValueChange={v => {
									setPoints(v)
									markDirty()
								}}
							>
								<SelectTrigger className='h-9 w-28 text-xs bg-slate-700 border-slate-700'>
									<SelectValue placeholder='Unestimated' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='unestimated'>Unestimated</SelectItem>
									<SelectItem value='1'>1</SelectItem>
									<SelectItem value='2'>2</SelectItem>
									<SelectItem value='4'>4</SelectItem>
									<SelectItem value='8'>8</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Deadline - only for releases */}
					{storyType === 'release' && (
						<div className='flex items-center px-3 py-2 border-b border-slate-700'>
							<span className='w-32 text-xs text-slate-400 uppercase tracking-wide'>Deadline</span>
							<div className='flex items-center gap-2'>
								<Calendar className='h-4 w-4 text-slate-400' />
								<Input
									type='date'
									value={deadline}
									onChange={e => {
										setDeadline(e.target.value)
										markDirty()
									}}
									className='h-9 w-36 text-xs bg-slate-700 border-slate-700'
								/>
								{deadline && (
									<button
										onClick={() => {
											setDeadline('')
											markDirty()
										}}
										className='p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-slate-200'
										title='Clear deadline'
									>
										<X className='h-3.5 w-3.5' />
									</button>
								)}
							</div>
						</div>
					)}

					{/* State */}
					<div className='flex items-center px-3 py-2 border-b border-slate-700'>
						<span className='w-32 text-xs text-slate-400 uppercase tracking-wide'>State</span>
						<div className='flex items-center gap-2'>
							<Select
								value={state}
								onValueChange={v => {
									setState(v as StoryState)
									markDirty()
								}}
							>
								<SelectTrigger
									className={cn(
										'h-9 w-32 text-xs border',
										storyStateConfig[state].bgClass,
										storyStateConfig[state].textClass,
										storyStateConfig[state].borderClass,
									)}
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{(Object.keys(storyStateConfig) as StoryState[]).map(stateKey => {
										const config = storyStateConfig[stateKey]
										return (
											<SelectItem key={stateKey} value={stateKey}>
												<div className='flex items-center gap-2'>
													<span className={cn('w-2 h-2 rounded-full', config.bgClass.replace('/20', ''))} />
													{config.label}
												</div>
											</SelectItem>
										)
									})}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Requester (placeholder) */}
					<div className='flex items-center px-3 py-2 border-b border-slate-700'>
						<span className='w-32 text-xs text-slate-400 uppercase tracking-wide'>Requester</span>
						<div className='flex items-center gap-2'>
							<div className='w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center'>
								<User className='h-3.5 w-3.5 text-slate-400' />
							</div>
							<span className='text-xs text-slate-300'>Demo User</span>
						</div>
					</div>

					{/* Owners (placeholder) */}
					<div className='flex items-center px-3 py-2'>
						<span className='w-32 text-xs text-slate-400 uppercase tracking-wide'>Owners</span>
						<div className='flex items-center gap-2'>
							<span className='text-xs text-slate-500'>&lt;none&gt;</span>
							<button className='p-2 hover:bg-slate-700 rounded' aria-label='Add owner'>
								<Plus className='h-3.5 w-3.5 text-slate-500' />
							</button>
						</div>
					</div>
				</div>

				{/* Description */}
				<div className='px-3 py-3 border-b border-slate-700'>
					<div className='flex items-center justify-between mb-2'>
						<span className='text-xs text-slate-400 uppercase tracking-wide'>Description</span>
						<button
							onClick={() => setIsEditingDescription(!isEditingDescription)}
							className='p-1 hover:bg-slate-700 rounded transition-colors'
							title={isEditingDescription ? 'Preview' : 'Edit'}
						>
							{isEditingDescription ? (
								<Eye className='h-3.5 w-3.5 text-slate-400' />
							) : (
								<Pencil className='h-3.5 w-3.5 text-slate-400' />
							)}
						</button>
					</div>
					{isEditingDescription ? (
						<Textarea
							value={description}
							onChange={e => {
								setDescription(e.target.value)
								markDirty()
							}}
							placeholder='Add a description... (Markdown supported)'
							className='min-h-[200px] text-sm bg-slate-700 border-slate-700 focus:border-blue-400'
							rows={8}
						/>
					) : description ? (
						<div
							className='min-h-[80px] p-3 bg-slate-700/50 rounded-md border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors'
							onClick={() => setIsEditingDescription(true)}
						>
							<Markdown>{description}</Markdown>
						</div>
					) : (
						<div
							className='min-h-[80px] p-3 bg-slate-700/50 rounded-md border border-slate-700 border-dashed cursor-pointer hover:border-slate-600 transition-colors flex items-center justify-center'
							onClick={() => setIsEditingDescription(true)}
						>
							<span className='text-sm text-slate-500'>Click to add a description...</span>
						</div>
					)}
				</div>

				{/* Labels */}
				<div className='px-3 py-3'>
					<div className='flex items-center justify-between mb-2'>
						<span className='text-xs text-slate-400 uppercase tracking-wide'>Labels</span>
					</div>
					<div className='flex flex-wrap items-center gap-2'>
						{story.labels.map(label => (
							<span
								key={label.id}
								className='inline-flex items-center gap-1 text-xs px-2 py-1 rounded font-medium'
								style={{ backgroundColor: label.color + '22', color: label.color }}
							>
								{label.name}
								<button
									onClick={() => handleRemoveLabel(label.id)}
									className='hover:opacity-70'
									aria-label={`Remove ${label.name} label`}
								>
									<X className='h-3 w-3' />
								</button>
							</span>
						))}
						{availableLabels.length > 0 && (
							<Select onValueChange={handleAddLabel}>
								<SelectTrigger className='h-8 w-8 p-0 border-dashed border-slate-600 bg-transparent'>
									<Plus className='h-3.5 w-3.5 text-slate-500' />
								</SelectTrigger>
								<SelectContent>
									{availableLabels.map(label => (
										<SelectItem key={label.id} value={label.id}>
											<span className='inline-block w-2 h-2 rounded-full mr-2' style={{ backgroundColor: label.color }} />
											{label.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>
				</div>

				{/* Comments - lazy-loaded when story is expanded */}
				<CommentSection storyId={story.id} comments={story.comments} commentCount={story.commentCount} />
			</div>
		</div>
	)
}
