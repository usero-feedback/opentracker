import type { Story } from './tracker-db.server'

export type ReleaseRisk = 'on-track' | 'at-risk' | 'overdue'

export interface IterationGroup {
	index: number
	startDate: Date
	endDate: Date
	isCurrent: boolean
	stories: Story[]
	totalPoints: number
	acceptedPoints: number
}

interface IterationPlanningOptions {
	velocity: number
	iterationLengthDays: number
	projectStartDate: Date
}

/**
 * Groups stories into iterations based on velocity and position order.
 * Stories auto-group into iterations when their cumulative points exceed velocity.
 */
export function groupStoriesIntoIterations(stories: Story[], options: IterationPlanningOptions): IterationGroup[] {
	const { velocity, iterationLengthDays, projectStartDate } = options
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	// Find current iteration index (how many iterations have passed since project start)
	let iterationStart = new Date(projectStartDate)
	iterationStart.setHours(0, 0, 0, 0)
	let currentIterationIndex = 0

	while (addDays(iterationStart, iterationLengthDays) <= today) {
		iterationStart = addDays(iterationStart, iterationLengthDays)
		currentIterationIndex++
	}

	const iterations: IterationGroup[] = []
	let iterationPoints = 0
	let iterationStories: Story[] = []
	let iterationIndex = currentIterationIndex

	// Sort stories by position (they should already be sorted, but ensure)
	const sortedStories = [...stories].sort((a, b) => a.position - b.position)

	for (const story of sortedStories) {
		const storyPoints = story.points ?? 0 // Unestimated = 0 for planning

		// If adding this story exceeds velocity, start new iteration
		// (unless this is the first story in the iteration)
		if (iterationPoints + storyPoints > velocity && iterationStories.length > 0) {
			const startDate = addDays(projectStartDate, iterationIndex * iterationLengthDays)
			iterations.push({
				index: iterationIndex,
				startDate,
				endDate: addDays(startDate, iterationLengthDays - 1),
				isCurrent: iterationIndex === currentIterationIndex,
				stories: iterationStories,
				totalPoints: iterationPoints,
				acceptedPoints: iterationStories.filter(s => s.state === 'accepted').reduce((sum, s) => sum + (s.points ?? 0), 0),
			})
			iterationPoints = 0
			iterationStories = []
			iterationIndex++
		}

		iterationPoints += storyPoints
		iterationStories.push(story)
	}

	// Don't forget the last iteration
	if (iterationStories.length > 0) {
		const startDate = addDays(projectStartDate, iterationIndex * iterationLengthDays)
		iterations.push({
			index: iterationIndex,
			startDate,
			endDate: addDays(startDate, iterationLengthDays - 1),
			isCurrent: iterationIndex === currentIterationIndex,
			stories: iterationStories,
			totalPoints: iterationPoints,
			acceptedPoints: iterationStories.filter(s => s.state === 'accepted').reduce((sum, s) => sum + (s.points ?? 0), 0),
		})
	}

	return iterations
}

/**
 * Calculate the risk level for a release story based on velocity planning.
 *
 * @param release - The release story with a deadline
 * @param releaseIterationEndDate - The end date of the iteration containing this release
 * @param iterationLengthDays - Length of one iteration in days
 * @returns Risk level: 'on-track', 'at-risk', or 'overdue'
 */
export function calculateReleaseRisk(release: Story, releaseIterationEndDate: Date, iterationLengthDays: number): ReleaseRisk {
	if (!release.deadline) return 'on-track' // No deadline = always fine

	// Parse as local timezone by appending time
	const deadline = new Date(release.deadline + 'T00:00:00')
	deadline.setHours(23, 59, 59, 999) // End of deadline day
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	// Already past deadline
	if (deadline < today) return 'overdue'

	// Normalize releaseIterationEndDate
	const iterationEnd = new Date(releaseIterationEndDate)
	iterationEnd.setHours(23, 59, 59, 999)

	// Won't finish in time based on velocity - at risk, not overdue yet
	if (iterationEnd > deadline) return 'at-risk'

	// Check if it's close (within 1 iteration of deadline)
	const bufferDate = addDays(deadline, -iterationLengthDays)
	if (iterationEnd > bufferDate) return 'at-risk'

	return 'on-track'
}

/**
 * Find which iteration a release story falls into based on the iteration groups.
 */
export function findReleaseIteration(releaseStory: Story, iterations: IterationGroup[]): IterationGroup | undefined {
	for (const iteration of iterations) {
		if (iteration.stories.some(s => s.id === releaseStory.id)) {
			return iteration
		}
	}
	return undefined
}

// Helper function to add days to a date
function addDays(date: Date, days: number): Date {
	const result = new Date(date)
	result.setDate(result.getDate() + days)
	return result
}

/**
 * Format a date for iteration header display.
 * Shows "2 Dec" format.
 */
export function formatIterationDate(date: Date): string {
	return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * Get default project start date (Monday of the current week).
 */
export function getDefaultProjectStartDate(): Date {
	const today = new Date()
	const dayOfWeek = today.getDay()
	const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
	const monday = new Date(today)
	monday.setDate(today.getDate() + mondayOffset)
	monday.setHours(0, 0, 0, 0)
	return monday
}
