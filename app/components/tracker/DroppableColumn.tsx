import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '~/lib/utils'
import type { Story } from './types'

interface DroppableColumnProps {
	id: string
	stories: Story[]
	children: React.ReactNode
}

export function DroppableColumn({ id, stories, children }: DroppableColumnProps) {
	const { setNodeRef, isOver } = useDroppable({ id })

	return (
		<div
			ref={setNodeRef}
			className={cn('min-h-[50px] transition-all duration-150', isOver && 'bg-blue-900/20 ring-2 ring-inset ring-blue-500/30')}
		>
			<SortableContext items={stories.map(s => s.id)} strategy={verticalListSortingStrategy}>
				{children}
			</SortableContext>
		</div>
	)
}
