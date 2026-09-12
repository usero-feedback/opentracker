import { useState, useEffect } from 'react'
import { useFetcher } from 'react-router'
import { Loader2, MessageSquare, User } from 'lucide-react'
import { Textarea } from '~/components/ui/textarea'
import { Button } from '~/components/ui/button'
import { Markdown } from '~/components/ui/markdown'
import { jsonToFormData } from '~/utils/deserialise'
import type { Comment } from './types'

interface CommentSectionProps {
	storyId: string
	comments?: Comment[] // Optional - if undefined, comments will be lazy-loaded
	commentCount: number // Always provided from the story's commentCount
}

function formatRelativeTime(date: Date): string {
	const now = new Date()
	const diffMs = now.getTime() - new Date(date).getTime()
	const diffMins = Math.floor(diffMs / 60000)
	const diffHours = Math.floor(diffMs / 3600000)
	const diffDays = Math.floor(diffMs / 86400000)

	if (diffMins < 1) return 'just now'
	if (diffMins < 60) return `${diffMins}m ago`
	if (diffHours < 24) return `${diffHours}h ago`
	if (diffDays < 7) return `${diffDays}d ago`

	return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function CommentSection({ storyId, comments: initialComments, commentCount }: CommentSectionProps) {
	const fetcher = useFetcher()
	const commentsFetcher = useFetcher<{ success: boolean; comments: Comment[] }>()
	const [newComment, setNewComment] = useState('')
	const [isCollapsed, setIsCollapsed] = useState(false)

	// Use provided comments if available, otherwise use fetched comments
	const fetchedComments = commentsFetcher.data?.success ? commentsFetcher.data.comments : undefined
	const comments = initialComments ?? fetchedComments ?? []
	const isLoadingComments = !initialComments && commentsFetcher.state === 'loading'
	const needsToLoadComments = !initialComments && !fetchedComments && commentsFetcher.state === 'idle'

	// Lazy-load comments when section is expanded and comments haven't been loaded yet
	useEffect(() => {
		if (!isCollapsed && needsToLoadComments) {
			commentsFetcher.submit(jsonToFormData({ type: 'getComments', storyId }), { method: 'POST' })
		}
	}, [isCollapsed, needsToLoadComments, storyId, commentsFetcher])

	const handleSubmit = () => {
		if (!newComment.trim()) return

		fetcher.submit(
			jsonToFormData({
				type: 'addComment',
				storyId,
				content: newComment.trim(),
			}),
			{ method: 'POST' },
		)

		setNewComment('')
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault()
			handleSubmit()
		}
	}

	const isSubmitting = fetcher.state !== 'idle'

	// Show the commentCount from the story prop (always available), or actual loaded count
	const displayCount = initialComments ? initialComments.length : fetchedComments ? fetchedComments.length : commentCount

	return (
		<div className='px-3 py-3 border-t border-slate-700'>
			{/* Section Header */}
			<button
				onClick={() => setIsCollapsed(!isCollapsed)}
				className='flex items-center gap-2 mb-3 w-full text-left hover:opacity-80 transition-opacity'
			>
				<span className='text-xs text-slate-400 uppercase tracking-wide'>Comments {displayCount > 0 && `(${displayCount})`}</span>
				<span className='text-xs text-slate-500'>{isCollapsed ? '▸' : '▾'}</span>
			</button>

			{!isCollapsed && (
				<>
					{/* Loading State */}
					{isLoadingComments && (
						<div className='py-6 text-center mb-4'>
							<Loader2 className='h-6 w-6 text-slate-500 mx-auto mb-2 animate-spin' />
							<p className='text-sm text-slate-500'>Loading comments...</p>
						</div>
					)}

					{/* Comments List */}
					{!isLoadingComments && comments.length > 0 && (
						<div className='space-y-0 mb-4'>
							{comments.map(comment => (
								<div key={comment.id} className='flex gap-3 py-3 border-b border-slate-700/50 last:border-b-0'>
									{/* Avatar */}
									<div className='w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center shrink-0'>
										<User className='h-3.5 w-3.5 text-slate-400' />
									</div>

									{/* Content */}
									<div className='flex-1 min-w-0'>
										<div className='flex items-baseline gap-2'>
											<span className='text-xs font-medium text-slate-300'>Demo User</span>
											<span className='text-[10px] text-slate-500'>{formatRelativeTime(comment.createdAt)}</span>
										</div>
										<div className='mt-1 text-sm text-slate-300 leading-relaxed'>
											<Markdown>{comment.content}</Markdown>
										</div>
									</div>
								</div>
							))}
						</div>
					)}

					{/* Empty State */}
					{!isLoadingComments && comments.length === 0 && (
						<div className='py-6 text-center mb-4'>
							<MessageSquare className='h-8 w-8 text-slate-600 mx-auto mb-2' />
							<p className='text-sm text-slate-500'>No comments yet</p>
							<p className='text-xs text-slate-600 mt-1'>Be the first to add one</p>
						</div>
					)}

					{/* Comment Input */}
					<div className='flex gap-3'>
						{/* Avatar */}
						<div className='w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center shrink-0 mt-1'>
							<User className='h-3.5 w-3.5 text-slate-400' />
						</div>

						{/* Input area */}
						<div className='flex-1'>
							<Textarea
								value={newComment}
								onChange={e => setNewComment(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder='Write a comment... (Markdown supported)'
								className='min-h-[60px] text-sm bg-slate-700 border-slate-700 focus:border-blue-400 resize-none'
								rows={2}
								disabled={isSubmitting}
							/>
							<div className='flex items-center justify-between mt-2'>
								<span className='text-[10px] text-slate-500'>Cmd+Enter to submit</span>
								<Button
									size='sm'
									disabled={!newComment.trim() || isSubmitting}
									onClick={handleSubmit}
									className='bg-blue-600 hover:bg-blue-500 h-7 px-3 text-xs'
								>
									{isSubmitting ? 'Posting...' : 'Comment'}
								</Button>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	)
}
