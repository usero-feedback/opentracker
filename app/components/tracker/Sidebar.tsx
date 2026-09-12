import { Plus, Archive, CheckCircle2, LayoutList, Tags, TrendingUp, FolderOpen, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Wordmark } from '~/components/Wordmark'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'

type ViewType = 'current' | 'icebox' | 'done'

interface SidebarItemProps {
	icon: typeof LayoutList
	label: string
	count?: number
	active?: boolean
	onClick?: () => void
}

function SidebarItem({ icon: Icon, label, count, active, onClick }: SidebarItemProps) {
	return (
		<button
			onClick={onClick}
			className={cn(
				'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors rounded-sm',
				active ? 'bg-slate-700/50 text-slate-100' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
			)}
		>
			<Icon className='h-4 w-4 shrink-0' />
			<span className='text-sm flex-1'>{label}</span>
			{count !== undefined && <span className='text-xs text-slate-500'>{count}</span>}
		</button>
	)
}

interface SidebarProps {
	projectName: string
	activeView: ViewType
	onViewChange: (view: ViewType) => void
	onAddStory: () => void
	onVelocityClick?: () => void
	stats: {
		currentCount: number
		iceboxCount: number
		doneCount: number
	}
	labelsCount: number
	onNavigate?: () => void // Called when navigating (to close mobile drawer)
}

export function Sidebar({
	projectName,
	activeView,
	onViewChange,
	onAddStory,
	onVelocityClick,
	stats,
	labelsCount,
	onNavigate,
}: SidebarProps) {
	const handleViewChange = (view: ViewType) => {
		onViewChange(view)
		onNavigate?.()
	}

	const handleAddStory = () => {
		onAddStory()
		onNavigate?.()
	}

	const handleVelocityClick = () => {
		onVelocityClick?.()
		onNavigate?.()
	}
	return (
		<div className='w-52 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col'>
			{/* Project Header */}
			<div className='p-3 border-b border-slate-800'>
				<Link to='/tracker' className='block mb-3'>
					<Wordmark className='text-base' />
				</Link>
				<Link
					to='/tracker?list'
					className='flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors group'
				>
					<FolderOpen className='h-4 w-4' />
					<span className='truncate flex-1'>{projectName}</span>
					<ChevronRight className='h-3 w-3 opacity-50 group-hover:opacity-100' />
				</Link>
			</div>

			{/* Add Story Button */}
			<div className='p-2 border-b border-slate-800'>
				<Button
					onClick={handleAddStory}
					className='w-full justify-start gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border-0'
				>
					<Plus className='h-4 w-4' />
					Add Story
				</Button>
			</div>

			{/* Navigation */}
			<nav className='flex-1 p-2 space-y-0.5 overflow-y-auto'>
				{/* Board view shows Current + Icebox side by side */}
				<SidebarItem
					icon={LayoutList}
					label='Board'
					count={stats.currentCount + stats.iceboxCount}
					active={activeView === 'current'}
					onClick={() => handleViewChange('current')}
				/>
				<SidebarItem
					icon={Archive}
					label='Icebox'
					count={stats.iceboxCount}
					active={activeView === 'icebox'}
					onClick={() => handleViewChange('icebox')}
				/>
				<SidebarItem
					icon={CheckCircle2}
					label='Done'
					count={stats.doneCount}
					active={activeView === 'done'}
					onClick={() => handleViewChange('done')}
				/>

				<div className='pt-4 pb-1'>
					<span className='text-[10px] uppercase tracking-wider text-slate-600 px-3'>Organize</span>
				</div>
				{/* Issue #6: Disable non-functional sidebar items */}
				<SidebarItem icon={Tags} label='Labels' count={labelsCount} />

				<div className='pt-4 pb-1'>
					<span className='text-[10px] uppercase tracking-wider text-slate-600 px-3'>Reports</span>
				</div>
				<SidebarItem icon={TrendingUp} label='Velocity' onClick={handleVelocityClick} />
			</nav>
		</div>
	)
}
