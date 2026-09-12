import { Star, Bug, Settings, Flag } from 'lucide-react'
import type { StoryType, StoryState, Story } from './types'
import type { ReleaseRisk } from '~/utils/iteration-planning'

// Story type configuration with icons and colors
export const storyTypeConfig: Record<StoryType, { icon: typeof Star; color: string; bgColor: string }> = {
	feature: { icon: Star, color: 'text-amber-400', bgColor: 'bg-amber-400' },
	bug: { icon: Bug, color: 'text-red-400', bgColor: 'bg-red-400' },
	chore: { icon: Settings, color: 'text-slate-400', bgColor: 'bg-slate-400' },
	release: { icon: Flag, color: 'text-blue-400', bgColor: 'bg-blue-400' },
}

// Story state configuration with colors for display
export const storyStateConfig: Record<
	StoryState,
	{
		label: string
		bgClass: string
		textClass: string
		borderClass: string
	}
> = {
	unscheduled: { label: 'Unscheduled', bgClass: 'bg-slate-700', textClass: 'text-slate-300', borderClass: 'border-slate-600' },
	unstarted: { label: 'Unstarted', bgClass: 'bg-slate-700', textClass: 'text-slate-300', borderClass: 'border-slate-600' },
	started: { label: 'Started', bgClass: 'bg-blue-600/20', textClass: 'text-blue-300', borderClass: 'border-blue-500/30' },
	finished: { label: 'Finished', bgClass: 'bg-purple-600/20', textClass: 'text-purple-300', borderClass: 'border-purple-500/30' },
	delivered: { label: 'Delivered', bgClass: 'bg-amber-600/20', textClass: 'text-amber-300', borderClass: 'border-amber-500/30' },
	accepted: {
		label: 'Accepted',
		bgClass: 'bg-emerald-600/20',
		textClass: 'text-emerald-300',
		borderClass: 'border-emerald-500/30',
	},
	rejected: { label: 'Rejected', bgClass: 'bg-red-600/20', textClass: 'text-red-300', borderClass: 'border-red-500/30' },
}

// Release risk styling
export const releaseRiskStyles: Record<ReleaseRisk, { bg: string; text: string; border: string }> = {
	'on-track': {
		bg: 'bg-blue-900/90',
		text: 'text-blue-100',
		border: 'border-blue-700',
	},
	'at-risk': {
		bg: 'bg-amber-700',
		text: 'text-white',
		border: 'border-amber-600',
	},
	overdue: {
		bg: 'bg-red-800',
		text: 'text-white',
		border: 'border-red-700',
	},
}

// State transition machine - defines valid actions from each state
// Issue #3: Allow unscheduled stories to be started
export const stateTransitions: Record<StoryState, string[]> = {
	unscheduled: ['start'],
	unstarted: ['start'],
	started: ['finish'],
	finished: ['deliver'],
	delivered: ['accept', 'reject'],
	rejected: ['restart'],
	accepted: [],
}

// Check if a transition is valid
export function canTransition(state: StoryState, action: string): boolean {
	return stateTransitions[state]?.includes(action) ?? false
}

// Get the next action button configuration for a story
// Issue #3: Show Start button for unscheduled stories
export function getStateButton(
	story: Story,
): { label: string; action: string; variant: 'accept' | 'reject' | 'deliver' | 'finish' | 'start' | 'restart' } | null {
	switch (story.state) {
		case 'unscheduled':
		case 'unstarted':
			return { label: 'Start', action: 'start', variant: 'start' }
		case 'started':
			return { label: 'Finish', action: 'finish', variant: 'finish' }
		case 'finished':
			return { label: 'Deliver', action: 'deliver', variant: 'deliver' }
		case 'delivered':
			return null // Shows Accept/Reject buttons instead
		case 'rejected':
			return { label: 'Restart', action: 'restart', variant: 'restart' }
		case 'accepted':
			return null
	}
}
