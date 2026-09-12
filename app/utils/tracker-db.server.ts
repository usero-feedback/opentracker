// Tracker database client with Prisma data access layer
// Multi-tenant aware - all operations scoped by projectId

import type { PrismaClient } from '@prisma/client'

export type StoryType = 'feature' | 'bug' | 'chore' | 'release'
export type StoryState = 'unscheduled' | 'unstarted' | 'started' | 'finished' | 'delivered' | 'accepted' | 'rejected'

export interface Label {
	id: string
	name: string
	color: string
}

export interface Comment {
	id: string
	content: string
	createdAt: Date
}

export interface Story {
	id: string
	number: number
	title: string
	description: string
	type: StoryType
	state: StoryState
	points: number | null
	labels: Label[]
	comments?: Comment[] // Optional - only loaded when story is expanded (lazy-loaded)
	commentCount: number
	priority: boolean
	iteration: number | null
	position: number
	deadline: string | null // ISO date string, only for release type
	createdAt: Date
	updatedAt: Date
}

export interface Iteration {
	id: number
	name: string
	startDate: Date
	endDate: Date
}

// ============================================================================
// Helper functions
// ============================================================================

// State priority for positioning during transitions
const STATE_PRIORITY: Record<StoryState, number> = {
	delivered: 0,
	finished: 1,
	started: 2,
	rejected: 3,
	unstarted: 4,
	unscheduled: 99,
	accepted: 99,
}

async function getTransitionPosition(
	prisma: PrismaClient,
	projectId: string,
	targetState: StoryState,
	excludeId: string,
): Promise<number> {
	const targetPriority = STATE_PRIORITY[targetState]

	// Find states that have priority >= targetPriority (i.e., at or below in display order)
	const statesAtOrBelow = (Object.keys(STATE_PRIORITY) as StoryState[]).filter(state => STATE_PRIORITY[state] >= targetPriority)

	// Use findFirst with ordering to get the minimum position in a single query
	const storyWithMinPosition = await prisma.story.findFirst({
		where: {
			projectId,
			id: { not: excludeId },
			state: { in: statesAtOrBelow },
		},
		orderBy: { position: 'asc' },
		select: { position: true },
	})

	if (!storyWithMinPosition) return 0
	return storyWithMinPosition.position - 1
}

// Convert Prisma story record to Story interface
function mapStory(record: {
	id: string
	number: number
	title: string
	description: string
	type: string
	state: string
	points: number | null
	priority: boolean
	iteration: number | null
	position: number
	deadline: string | null
	createdAt: Date
	updatedAt: Date
	labels: Array<{
		label: {
			id: string
			name: string
			color: string
		}
	}>
	comments: Array<{
		id: string
		content: string
		createdAt: Date
	}>
	_count?: {
		comments: number
	}
}): Story {
	return {
		id: record.id,
		number: record.number,
		title: record.title,
		description: record.description,
		type: record.type as StoryType,
		state: record.state as StoryState,
		points: record.points,
		priority: record.priority,
		iteration: record.iteration,
		position: record.position,
		deadline: record.deadline,
		labels: record.labels.map(sl => sl.label),
		comments: record.comments.map(c => ({
			id: c.id,
			content: c.content,
			createdAt: c.createdAt,
		})),
		commentCount: record._count?.comments ?? record.comments.length,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	}
}

// Convert Prisma story record to Story interface WITHOUT loading comments (for list views)
// This is used for lazy-loading optimization - comments are fetched separately when a story is expanded
function mapStoryWithoutComments(record: {
	id: string
	number: number
	title: string
	description: string
	type: string
	state: string
	points: number | null
	priority: boolean
	iteration: number | null
	position: number
	deadline: string | null
	createdAt: Date
	updatedAt: Date
	labels: Array<{
		label: {
			id: string
			name: string
			color: string
		}
	}>
	_count: {
		comments: number
	}
}): Story {
	return {
		id: record.id,
		number: record.number,
		title: record.title,
		description: record.description,
		type: record.type as StoryType,
		state: record.state as StoryState,
		points: record.points,
		priority: record.priority,
		iteration: record.iteration,
		position: record.position,
		deadline: record.deadline,
		labels: record.labels.map(sl => sl.label),
		// comments is intentionally omitted - will be lazy-loaded when story is expanded
		commentCount: record._count.comments,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	}
}

// Compute iterations based on project settings
// This replaces the old stored iteration records
export function computeIterations(projectStartDate: Date, iterationLength: number, count: number = 12): Iteration[] {
	const iterations: Iteration[] = []
	const lengthMs = iterationLength * 24 * 60 * 60 * 1000

	for (let i = 0; i < count; i++) {
		const startDate = new Date(projectStartDate.getTime() + i * lengthMs)
		const endDate = new Date(startDate.getTime() + lengthMs - 1)

		iterations.push({
			id: i + 1,
			name: `Iteration ${i + 1}`,
			startDate,
			endDate,
		})
	}

	return iterations
}

// ============================================================================
// Public API - Multi-tenant tracker database
// ============================================================================

export function createTrackerDb(prisma: PrismaClient, projectId: string) {
	return {
		// Stories - query methods
		async getAllStories(): Promise<Story[]> {
			const stories = await prisma.story.findMany({
				where: { projectId },
				include: {
					labels: {
						include: {
							label: true,
						},
					},
					comments: {
						orderBy: { createdAt: 'asc' },
					},
					_count: {
						select: { comments: true },
					},
				},
				orderBy: [{ iteration: 'asc' }, { position: 'asc' }],
			})

			return stories.map(mapStory).sort((a, b) => {
				if (a.iteration === null && b.iteration !== null) return 1
				if (a.iteration !== null && b.iteration === null) return -1
				if (a.iteration !== b.iteration) return (a.iteration ?? 0) - (b.iteration ?? 0)
				return a.position - b.position
			})
		},

		async getStoriesByIteration(iterationId: number | null): Promise<Story[]> {
			const stories = await prisma.story.findMany({
				where: {
					projectId,
					iteration: iterationId,
				},
				include: {
					labels: {
						include: {
							label: true,
						},
					},
					comments: {
						orderBy: { createdAt: 'asc' },
					},
					_count: {
						select: { comments: true },
					},
				},
				orderBy: { position: 'asc' },
			})

			return stories.map(mapStory)
		},

		async getCurrentStories(): Promise<Story[]> {
			const stories = await prisma.story.findMany({
				where: {
					projectId,
					state: {
						in: ['unstarted', 'started', 'finished', 'delivered', 'rejected'],
					},
				},
				include: {
					labels: {
						include: {
							label: true,
						},
					},
					// comments intentionally NOT included - lazy-loaded when story is expanded
					_count: {
						select: { comments: true },
					},
				},
				orderBy: { position: 'asc' },
			})

			return stories.map(mapStoryWithoutComments)
		},

		async getBacklogStories(): Promise<Story[]> {
			const stories = await prisma.story.findMany({
				where: {
					projectId,
					iteration: { not: null },
					state: 'unstarted',
				},
				include: {
					labels: {
						include: {
							label: true,
						},
					},
					comments: {
						orderBy: { createdAt: 'asc' },
					},
					_count: {
						select: { comments: true },
					},
				},
				orderBy: [{ iteration: 'asc' }, { position: 'asc' }],
			})

			return stories.map(mapStory)
		},

		async getIceboxStories(): Promise<Story[]> {
			const stories = await prisma.story.findMany({
				where: {
					projectId,
					iteration: null,
				},
				include: {
					labels: {
						include: {
							label: true,
						},
					},
					// comments intentionally NOT included - lazy-loaded when story is expanded
					_count: {
						select: { comments: true },
					},
				},
				orderBy: { position: 'asc' },
			})

			return stories.map(mapStoryWithoutComments)
		},

		async getDoneStories(): Promise<Story[]> {
			const stories = await prisma.story.findMany({
				where: {
					projectId,
					state: 'accepted',
				},
				include: {
					labels: {
						include: {
							label: true,
						},
					},
					// comments intentionally NOT included - lazy-loaded when story is expanded
					_count: {
						select: { comments: true },
					},
				},
				orderBy: { updatedAt: 'desc' },
			})

			return stories.map(mapStoryWithoutComments)
		},

		async getStoryById(id: string): Promise<Story | undefined> {
			// Use findFirst with projectId in where clause to combine lookup and ownership check
			const story = await prisma.story.findFirst({
				where: { id, projectId },
				include: {
					labels: {
						include: {
							label: true,
						},
					},
					comments: {
						orderBy: { createdAt: 'asc' },
					},
					_count: {
						select: { comments: true },
					},
				},
			})

			if (!story) {
				return undefined
			}

			return mapStory(story)
		},

		// Lightweight lookup for when we just need state/priority (e.g., for transition validation)
		async getStoryState(id: string): Promise<{ state: StoryState; priority: boolean } | undefined> {
			const story = await prisma.story.findFirst({
				where: { id, projectId },
				select: { state: true, priority: true },
			})

			if (!story) {
				return undefined
			}

			return { state: story.state as StoryState, priority: story.priority }
		},

		// Get comments for a story (lazy-loaded when story is expanded)
		async getStoryComments(storyId: string): Promise<Comment[]> {
			// Verify story belongs to this project
			const story = await prisma.story.findFirst({
				where: { id: storyId, projectId },
				select: { id: true },
			})

			if (!story) {
				return []
			}

			const comments = await prisma.comment.findMany({
				where: { storyId },
				orderBy: { createdAt: 'asc' },
			})

			return comments.map(c => ({
				id: c.id,
				content: c.content,
				createdAt: c.createdAt,
			}))
		},

		// Stories - mutation methods
		async createStory(
			data: Omit<Story, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'position' | 'comments' | 'commentCount'> & {
				id?: string
			},
		): Promise<Story> {
			// Calculate position and get next story number in parallel (independent queries)
			const [storiesInSameGroup, maxNumberStory] = await Promise.all([
				prisma.story.findMany({
					where: {
						projectId,
						iteration: data.iteration,
					},
					select: { position: true },
				}),
				prisma.story.findFirst({
					where: { projectId },
					orderBy: { number: 'desc' },
					select: { number: true },
				}),
			])

			const maxPosition = storiesInSameGroup.length > 0 ? Math.max(...storiesInSameGroup.map(s => s.position)) : -1
			const nextNumber = maxNumberStory ? maxNumberStory.number + 1 : 1

			// Create story
			const story = await prisma.story.create({
				data: {
					id: data.id || `s${Date.now()}`,
					number: nextNumber,
					projectId,
					title: data.title,
					description: data.description,
					type: data.type,
					state: data.state,
					points: data.points,
					priority: data.priority,
					iteration: data.iteration,
					position: maxPosition + 1,
					deadline: data.deadline,
					// Connect labels via StoryLabel join table
					labels: {
						create: data.labels.map(label => ({
							label: {
								connect: { id: label.id },
							},
						})),
					},
				},
				include: {
					labels: {
						include: {
							label: true,
						},
					},
					comments: {
						orderBy: { createdAt: 'asc' },
					},
					_count: {
						select: { comments: true },
					},
				},
			})

			return mapStory(story)
		},

		async updateStory(id: string, updates: Partial<Omit<Story, 'id' | 'createdAt'>>): Promise<Story | undefined> {
			// Handle label updates separately - labels require special handling
			const { labels, ...otherUpdates } = updates

			// Build update data for non-label fields
			const updateData: {
				title?: string
				description?: string
				type?: string
				state?: string
				points?: number | null
				priority?: boolean
				iteration?: number | null
				position?: number
				deadline?: string | null
				updatedAt?: Date
			} = {
				...otherUpdates,
				updatedAt: new Date(),
			}

			// Use updateMany with projectId in where clause to combine ownership check with update
			// This eliminates the separate ownership verification query
			const result = await prisma.story.updateMany({
				where: { id, projectId },
				data: updateData,
			})

			// If no rows were updated, story doesn't exist or doesn't belong to this project
			if (result.count === 0) {
				return undefined
			}

			// If labels are being updated, handle them separately
			if (labels !== undefined) {
				// Delete all existing labels for this story
				await prisma.storyLabel.deleteMany({
					where: { storyId: id },
				})
				// Create new label associations
				if (labels.length > 0) {
					await prisma.storyLabel.createMany({
						data: labels.map(label => ({
							storyId: id,
							labelId: label.id,
						})),
					})
				}
			}

			// Fetch and return the updated story
			return this.getStoryById(id)
		},

		async deleteStory(id: string): Promise<boolean> {
			try {
				// Use deleteMany with projectId in where clause to combine ownership check with delete
				const result = await prisma.story.deleteMany({
					where: { id, projectId },
				})
				return result.count > 0
			} catch {
				return false
			}
		},

		// Lightweight update - doesn't fetch story back (for operations where we just need success/fail)
		async updateStoryFields(
			id: string,
			fields: {
				state?: StoryState
				position?: number
				iteration?: number | null
				priority?: boolean
			},
		): Promise<boolean> {
			const result = await prisma.story.updateMany({
				where: { id, projectId },
				data: {
					...fields,
					updatedAt: new Date(),
				},
			})
			return result.count > 0
		},

		// State transitions - use lightweight update since we don't need the story back
		async startStory(id: string): Promise<boolean> {
			const newPosition = await getTransitionPosition(prisma, projectId, 'started', id)
			return this.updateStoryFields(id, { state: 'started', position: newPosition })
		},

		async finishStory(id: string): Promise<boolean> {
			const newPosition = await getTransitionPosition(prisma, projectId, 'finished', id)
			return this.updateStoryFields(id, { state: 'finished', position: newPosition })
		},

		async deliverStory(id: string): Promise<boolean> {
			const newPosition = await getTransitionPosition(prisma, projectId, 'delivered', id)
			return this.updateStoryFields(id, { state: 'delivered', position: newPosition })
		},

		async acceptStory(id: string): Promise<boolean> {
			return this.updateStoryFields(id, { state: 'accepted' })
		},

		async rejectStory(id: string): Promise<boolean> {
			const newPosition = await getTransitionPosition(prisma, projectId, 'rejected', id)
			return this.updateStoryFields(id, { state: 'rejected', position: newPosition })
		},

		async restartStory(id: string): Promise<boolean> {
			const newPosition = await getTransitionPosition(prisma, projectId, 'started', id)
			return this.updateStoryFields(id, { state: 'started', position: newPosition })
		},

		// Move story to iteration
		async moveToIteration(id: string, iterationId: number | null): Promise<Story | undefined> {
			const storiesInTarget = await prisma.story.findMany({
				where: {
					projectId,
					iteration: iterationId,
				},
				select: { position: true },
			})

			const maxPosition = storiesInTarget.length > 0 ? Math.max(...storiesInTarget.map(s => s.position)) : -1

			return this.updateStory(id, {
				iteration: iterationId,
				position: maxPosition + 1,
				state: iterationId === null ? 'unscheduled' : 'unstarted',
			})
		},

		// Reorder story (for drag-and-drop) - returns boolean since we don't need story back
		async reorderStory(id: string, newOrder: number, newIteration: number | null): Promise<boolean> {
			// Use lightweight state lookup instead of full story fetch
			const storyState = await this.getStoryState(id)
			if (!storyState) return false

			const updates: {
				position: number
				iteration: number | null
				state?: StoryState
			} = {
				position: newOrder,
				iteration: newIteration,
			}

			// Update state based on iteration
			if (newIteration === null && storyState.state !== 'unscheduled') {
				updates.state = 'unscheduled'
			} else if (newIteration !== null && storyState.state === 'unscheduled') {
				updates.state = 'unstarted'
			}

			return this.updateStoryFields(id, updates)
		},

		// Toggle priority - returns boolean since we don't need story back
		async togglePriority(id: string): Promise<boolean> {
			// Use lightweight state lookup instead of full story fetch
			const storyState = await this.getStoryState(id)
			if (!storyState) return false
			return this.updateStoryFields(id, { priority: !storyState.priority })
		},

		// Iterations (computed from project settings)
		async getAllIterations(): Promise<Iteration[]> {
			const project = await prisma.project.findUnique({
				where: { id: projectId },
				select: { createdAt: true, iterationLength: true },
			})

			if (!project) return []

			return computeIterations(project.createdAt, project.iterationLength)
		},

		async getIterationById(id: number): Promise<Iteration | undefined> {
			const iterations = await this.getAllIterations()
			return iterations.find(i => i.id === id)
		},

		// Labels
		async getAllLabels(): Promise<Label[]> {
			const labels = await prisma.label.findMany({
				where: { projectId },
				orderBy: { name: 'asc' },
			})

			return labels.map(l => ({
				id: l.id,
				name: l.name,
				color: l.color,
			}))
		},

		async getLabelById(id: string): Promise<Label | undefined> {
			const label = await prisma.label.findUnique({
				where: { id },
			})

			if (!label || label.projectId !== projectId) {
				return undefined
			}

			return {
				id: label.id,
				name: label.name,
				color: label.color,
			}
		},

		async addLabelToStory(storyId: string, labelId: string): Promise<Story | undefined> {
			const [story, label] = await Promise.all([this.getStoryById(storyId), this.getLabelById(labelId)])

			if (!story || !label) return undefined
			if (story.labels.some(l => l.id === labelId)) return story

			// Add label via StoryLabel join table
			await prisma.storyLabel.create({
				data: {
					storyId,
					labelId,
				},
			})

			return this.getStoryById(storyId)
		},

		async removeLabelFromStory(storyId: string, labelId: string): Promise<Story | undefined> {
			const story = await this.getStoryById(storyId)
			if (!story) return undefined

			// Remove label via StoryLabel join table
			await prisma.storyLabel.delete({
				where: {
					storyId_labelId: {
						storyId,
						labelId,
					},
				},
			})

			return this.getStoryById(storyId)
		},

		// Comments
		async addComment(storyId: string, content: string): Promise<Comment> {
			const comment = await prisma.comment.create({
				data: {
					storyId,
					content,
				},
			})

			return {
				id: comment.id,
				content: comment.content,
				createdAt: comment.createdAt,
			}
		},

		async deleteComment(commentId: string): Promise<boolean> {
			try {
				await prisma.comment.delete({
					where: { id: commentId },
				})
				return true
			} catch {
				return false
			}
		},

		// Stats
		async getStats(): Promise<{
			currentCount: number
			currentPoints: number
			backlogCount: number
			backlogPoints: number
			iceboxCount: number
			doneCount: number
		}> {
			const stories = await prisma.story.findMany({
				where: { projectId },
				select: {
					state: true,
					iteration: true,
					points: true,
				},
			})

			const current = stories.filter(s => ['unstarted', 'started', 'finished', 'delivered', 'rejected'].includes(s.state))
			const backlog = stories.filter(s => s.iteration !== null && s.state === 'unstarted')
			const icebox = stories.filter(s => s.iteration === null)
			const done = stories.filter(s => s.state === 'accepted')

			const totalPoints = (arr: typeof stories) => arr.filter(s => s.points !== null).reduce((sum, s) => sum + (s.points ?? 0), 0)

			return {
				currentCount: current.length,
				currentPoints: totalPoints(current),
				backlogCount: backlog.length,
				backlogPoints: totalPoints(backlog),
				iceboxCount: icebox.length,
				doneCount: done.length,
			}
		},
	}
}

// ============================================================================
// Helper function to get or create default project for single-tenant usage
// ============================================================================

async function getOrCreateDefaultProject(prisma: PrismaClient): Promise<string> {
	// Look for first user and their first project
	const user = await prisma.user.findFirst({
		include: {
			projects: {
				take: 1,
				orderBy: { createdAt: 'asc' },
			},
		},
	})

	if (user?.projects[0]) {
		return user.projects[0].id
	}

	// No user exists - create default user and project
	// This is for local development / standalone tracker usage
	const newUser = await prisma.user.create({
		data: {
			email: 'tracker@localhost',
			password: 'unused', // Tracker doesn't have auth yet
			projects: {
				create: {
					name: 'Default Project',
					velocity: 10,
					iterationLength: 7,
				},
			},
		},
		include: {
			projects: true,
		},
	})

	return newUser.projects[0].id
}

// ============================================================================
// Legacy single-tenant API for backward compatibility
// This provides a global trackerDb interface for routes that don't have
// multi-tenant context yet. It automatically uses/creates a default project.
// ============================================================================

export function createLegacyTrackerDb(prisma: PrismaClient) {
	let cachedProjectId: string | null = null

	async function getProjectId(): Promise<string> {
		if (!cachedProjectId) {
			cachedProjectId = await getOrCreateDefaultProject(prisma)
		}
		return cachedProjectId
	}

	return {
		async getAllStories() {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.getAllStories()
		},

		async getStoriesByIteration(iterationId: number | null) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.getStoriesByIteration(iterationId)
		},

		async getCurrentStories() {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.getCurrentStories()
		},

		async getBacklogStories() {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.getBacklogStories()
		},

		async getIceboxStories() {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.getIceboxStories()
		},

		async getDoneStories() {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.getDoneStories()
		},

		async getStoryById(id: string) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.getStoryById(id)
		},

		async getStoryState(id: string) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.getStoryState(id)
		},

		async createStory(
			data: Omit<Story, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'position' | 'comments' | 'commentCount'> & {
				id?: string
			},
		) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.createStory(data)
		},

		async updateStory(id: string, updates: Partial<Omit<Story, 'id' | 'createdAt'>>) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.updateStory(id, updates)
		},

		async deleteStory(id: string) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.deleteStory(id)
		},

		async startStory(id: string) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.startStory(id)
		},

		async finishStory(id: string) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.finishStory(id)
		},

		async deliverStory(id: string) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.deliverStory(id)
		},

		async acceptStory(id: string) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.acceptStory(id)
		},

		async rejectStory(id: string) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.rejectStory(id)
		},

		async restartStory(id: string) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.restartStory(id)
		},

		async moveToIteration(id: string, iterationId: number | null) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.moveToIteration(id, iterationId)
		},

		async reorderStory(id: string, newOrder: number, newIteration: number | null) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.reorderStory(id, newOrder, newIteration)
		},

		async togglePriority(id: string) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.togglePriority(id)
		},

		async getAllIterations() {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.getAllIterations()
		},

		async getIterationById(id: number) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.getIterationById(id)
		},

		async getAllLabels() {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.getAllLabels()
		},

		async getLabelById(id: string) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.getLabelById(id)
		},

		async addLabelToStory(storyId: string, labelId: string) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.addLabelToStory(storyId, labelId)
		},

		async removeLabelFromStory(storyId: string, labelId: string) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.removeLabelFromStory(storyId, labelId)
		},

		async getStoryComments(storyId: string) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.getStoryComments(storyId)
		},

		async addComment(storyId: string, content: string) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.addComment(storyId, content)
		},

		async deleteComment(commentId: string) {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.deleteComment(commentId)
		},

		async getStats() {
			const projectId = await getProjectId()
			const db = createTrackerDb(prisma, projectId)
			return db.getStats()
		},
	}
}
