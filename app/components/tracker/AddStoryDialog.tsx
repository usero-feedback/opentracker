import { useState, useEffect } from 'react'
import { useFetcher } from 'react-router'
import { Calendar } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'
import { jsonToFormData } from '~/utils/deserialise'
import type { StoryType } from './types'

interface AddStoryDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function AddStoryDialog({ open, onOpenChange }: AddStoryDialogProps) {
	const fetcher = useFetcher()
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [storyType, setStoryType] = useState<StoryType>('feature')
	const [points, setPoints] = useState<string>('unestimated')
	const [deadline, setDeadline] = useState<string>('')

	// Reset form state when dialog opens
	useEffect(() => {
		if (open) {
			setTitle('')
			setDescription('')
			setStoryType('feature')
			setPoints('unestimated')
			setDeadline('')
		}
	}, [open])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		const id = crypto.randomUUID() // Generate client-side ID
		// All new stories go to icebox (iterationId: 'null')
		fetcher.submit(
			jsonToFormData({
				type: 'create',
				id,
				title,
				description,
				storyType,
				points,
				deadline: storyType === 'release' ? deadline : '',
				iterationId: 'null', // Always icebox
			}),
			{ method: 'POST' },
		)
		setTitle('')
		setDescription('')
		setStoryType('feature')
		setPoints('unestimated')
		setDeadline('')
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='bg-slate-900 border-slate-700 text-slate-200'>
				<DialogHeader>
					<DialogTitle className='text-slate-100'>Add Story</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className='space-y-4'>
					<div className='space-y-2'>
						<Label htmlFor='title' className='text-slate-300'>
							Title
						</Label>
						<Input
							id='title'
							value={title}
							onChange={e => setTitle(e.target.value)}
							placeholder='As a user, I want to...'
							className='bg-slate-800 border-slate-700 text-slate-200'
							required
						/>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='description' className='text-slate-300'>
							Description
						</Label>
						<Textarea
							id='description'
							value={description}
							onChange={e => setDescription(e.target.value)}
							placeholder='Additional details...'
							className='bg-slate-800 border-slate-700 text-slate-200'
							rows={3}
						/>
					</div>

					<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
						<div className='space-y-2'>
							<Label className='text-slate-300'>Type</Label>
							<Select value={storyType} onValueChange={v => setStoryType(v as StoryType)}>
								<SelectTrigger className='bg-slate-800 border-slate-700 text-slate-200'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent className='bg-slate-800 border-slate-700'>
									<SelectItem value='feature'>Feature</SelectItem>
									<SelectItem value='bug'>Bug</SelectItem>
									<SelectItem value='chore'>Chore</SelectItem>
									<SelectItem value='release'>Release</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{storyType !== 'release' && (
							<div className='space-y-2'>
								<Label className='text-slate-300'>Points</Label>
								<Select value={points} onValueChange={setPoints}>
									<SelectTrigger className='bg-slate-800 border-slate-700 text-slate-200'>
										<SelectValue placeholder='Unestimated' />
									</SelectTrigger>
									<SelectContent className='bg-slate-800 border-slate-700'>
										<SelectItem value='unestimated'>Unestimated</SelectItem>
										<SelectItem value='1'>1</SelectItem>
										<SelectItem value='2'>2</SelectItem>
										<SelectItem value='4'>4</SelectItem>
										<SelectItem value='8'>8</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}
					</div>

					{/* Deadline for releases */}
					{storyType === 'release' && (
						<div className='space-y-2'>
							<Label htmlFor='deadline' className='text-slate-300 flex items-center gap-2'>
								<Calendar className='h-4 w-4' />
								Deadline
							</Label>
							<Input
								id='deadline'
								type='date'
								value={deadline}
								onChange={e => setDeadline(e.target.value)}
								className='bg-slate-800 border-slate-700 text-slate-200'
							/>
						</div>
					)}

					<p className='text-xs text-slate-500'>New stories are added to Icebox. Drag to Current to start working.</p>

					<div className='flex justify-end gap-2 pt-2'>
						<Button
							type='button'
							variant='ghost'
							onClick={() => onOpenChange(false)}
							className='text-slate-400 hover:text-slate-200'
						>
							Cancel
						</Button>
						<Button type='submit' className='bg-blue-600 hover:bg-blue-500'>
							Add Story
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
