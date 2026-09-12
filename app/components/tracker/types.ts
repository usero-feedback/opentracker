import type { Story, StoryType, StoryState, Label, Comment } from '~/utils/tracker-db.server'

export type { Story, StoryType, StoryState, Label, Comment }

export interface VelocityDataPoint {
	iteration: number
	points: number
	startDate: Date
	endDate: Date
}

export interface TrackerLoaderData {
	currentStories: Story[]
	iceboxStories: Story[]
	doneStories: Story[]
	labels: Label[]
	stats: {
		currentCount: number
		currentPoints: number
		iceboxCount: number
		doneCount: number
	}
	project: {
		name: string
		velocity: number
		iterationLength: number
		startDate: Date
	}
	velocityData: VelocityDataPoint[]
	initialExpandedStory: number | null
}
