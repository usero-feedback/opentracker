import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from 'react-router'
import { data, useFetcher, useFetchers, useLoaderData } from 'react-router'
import { useToast } from '~/hooks/use-toast'
import { useKeyboardShortcut } from '~/hooks/use-keyboard-shortcut'
import {
	DndContext,
	DragOverlay,
	closestCorners,
	type DragEndEvent,
	type DragStartEvent,
	PointerSensor,
	TouchSensor,
	KeyboardSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Plus, Search, Menu } from 'lucide-react'
import { z } from 'zod'
import { Button } from '~/components/ui/button'
import { createTrackerDb } from '~/utils/tracker-db.server'
import { getPrisma } from '~/utils/db.server'
import { requireUser } from '~/utils/session.server'
import { deserialise, jsonToFormData, formDataToJson } from '~/utils/deserialise'
import {
	StoryCard,
	Sidebar,
	AddStoryDialog,
	DroppableColumn,
	canTransition,
	IterationHeader,
	VelocityControl,
	MobileDrawer,
	VelocityView,
} from '~/components/tracker'
import type { Story, StoryState, TrackerLoaderData } from '~/components/tracker'
import {
	groupStoriesIntoIterations,
	calculateReleaseRisk,
	findReleaseIteration,
	getDefaultProjectStartDate,
} from '~/utils/iteration-planning'
import type { ReleaseRisk } from '~/utils/iteration-planning'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	const projectName = data?.project?.name ?? 'Project'
	return [
		{ title: `${projectName}, opentracker` },
		{ name: 'description', content: 'Manage your project stories and iterations' },
	]
}

// Loader
export const loader = async ({ params, request, context }: LoaderFunctionArgs) => {
	// Require authentication
	const user = await requireUser(request, context)

	// Parse ?story param for initial expanded story
	const url = new URL(request.url)
	const storyParam = url.searchParams.get('story')
	const parsedStory = storyParam ? parseInt(storyParam, 10) : null
	const initialExpandedStory = parsedStory !== null && !isNaN(parsedStory) ? parsedStory : null

	// Get projectId from URL params
	const projectId = params.projectId
	if (!projectId) {
		throw new Response('Project ID is required', { status: 400 })
	}

	const prisma = getPrisma({ context })

	// Verify user owns this project
	const project = await prisma.project.findUnique({
		where: { id: projectId },
		select: {
			userId: true,
			name: true,
			velocity: true,
			iterationLength: true,
			createdAt: true,
		},
	})

	if (!project) {
		throw new Response('Project not found', { status: 404 })
	}

	if (project.userId !== user.id) {
		throw new Response('Unauthorized', { status: 403 })
	}

	try {
		const trackerDb = createTrackerDb(prisma, projectId)

		const [currentStories, iceboxStories, doneStories, labels, stats, allAcceptedStories] = await Promise.all([
			trackerDb.getCurrentStories(),
			trackerDb.getIceboxStories(),
			trackerDb.getDoneStories(),
			trackerDb.getAllLabels(),
			trackerDb.getStats(),
			prisma.story.findMany({
				where: {
					projectId,
					state: 'accepted',
					iteration: { not: null },
				},
				select: {
					iteration: true,
					points: true,
				},
			}),
		])

		// Group by iteration and sum points
		const velocityByIteration = new Map<number, number>()
		for (const story of allAcceptedStories) {
			if (story.iteration !== null) {
				const current = velocityByIteration.get(story.iteration) ?? 0
				velocityByIteration.set(story.iteration, current + (story.points ?? 0))
			}
		}

		// Convert to array and calculate iteration dates
		const velocityData = Array.from(velocityByIteration.entries())
			.map(([iteration, points]) => {
				const startDate = new Date(project.createdAt)
				startDate.setDate(startDate.getDate() + (iteration - 1) * project.iterationLength)
				const endDate = new Date(startDate)
				endDate.setDate(endDate.getDate() + project.iterationLength - 1)

				return {
					iteration,
					points,
					startDate,
					endDate,
				}
			})
			.sort((a, b) => a.iteration - b.iteration)

		return data<TrackerLoaderData>({
			currentStories,
			iceboxStories,
			doneStories,
			labels,
			stats,
			project: {
				name: project.name,
				velocity: project.velocity,
				iterationLength: project.iterationLength,
				startDate: project.createdAt,
			},
			velocityData,
			initialExpandedStory,
		})
	} catch (error) {
		throw new Response(error instanceof Error ? error.message : 'Failed to load tracker data', { status: 503 })
	}
}

// Action schemas
const ActionSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('transition'),
		storyId: z.string(),
		action: z.enum(['start', 'finish', 'deliver', 'accept', 'reject', 'restart']),
	}),
	z.object({
		type: z.literal('togglePriority'),
		storyId: z.string(),
	}),
	z.object({
		type: z.literal('moveToIteration'),
		storyId: z.string(),
		iterationId: z.string(), // 'null' for icebox
	}),
	z.object({
		type: z.literal('create'),
		id: z.string().optional(), // Client-provided ID
		title: z.string().min(1),
		description: z.string().optional(),
		storyType: z.enum(['feature', 'bug', 'chore', 'release']),
		points: z.string().optional(),
		deadline: z.string().optional(), // ISO date for releases
		iterationId: z.string().optional(),
	}),
	z.object({
		type: z.literal('delete'),
		storyId: z.string(),
	}),
	z.object({
		type: z.literal('update'),
		storyId: z.string(),
		title: z.string().optional(),
		description: z.string().optional(),
		storyType: z.enum(['feature', 'bug', 'chore', 'release']).optional(),
		state: z.enum(['unscheduled', 'unstarted', 'started', 'finished', 'delivered', 'accepted', 'rejected']).optional(),
		points: z.string().optional(),
		deadline: z.string().optional(), // ISO date for releases
	}),
	z.object({
		type: z.literal('addLabel'),
		storyId: z.string(),
		labelId: z.string(),
	}),
	z.object({
		type: z.literal('removeLabel'),
		storyId: z.string(),
		labelId: z.string(),
	}),
	z.object({
		type: z.literal('reorder'),
		storyId: z.string(),
		order: z.number(),
		newIteration: z.number().nullable(),
	}),
	z.object({
		type: z.literal('addComment'),
		storyId: z.string(),
		content: z.string().min(1),
	}),
	z.object({
		type: z.literal('getComments'),
		storyId: z.string(),
	}),
])

// Action
export const action = async ({ params, request, context }: ActionFunctionArgs) => {
	// Require authentication
	const user = await requireUser(request, context)

	// Get projectId from URL params
	const projectId = params.projectId
	if (!projectId) {
		return data({ error: 'Project ID is required' }, { status: 400 })
	}

	const prisma = getPrisma({ context })
	const trackerDb = createTrackerDb(prisma, projectId)

	// Parse action data first so we know which queries to run
	let actionData: z.infer<typeof ActionSchema>
	try {
		actionData = await deserialise(request, ActionSchema)
	} catch (error) {
		return data({ error: 'Invalid action data' }, { status: 400 })
	}

	// Determine if this action needs getStoryState
	const actionsNeedingStoryState = ['transition', 'addComment'] as const
	const needsStoryState =
		actionsNeedingStoryState.includes(actionData.type as (typeof actionsNeedingStoryState)[number]) && 'storyId' in actionData

	// Run verifyProject and getStoryState in parallel when both are needed
	let project: { userId: string } | null
	let storyState: { state: StoryState; priority: boolean } | undefined = undefined

	if (needsStoryState && 'storyId' in actionData) {
		const [projectResult, storyStateResult] = await Promise.all([
			prisma.project.findUnique({
				where: { id: projectId },
				select: { userId: true },
			}),
			trackerDb.getStoryState(actionData.storyId),
		])
		project = projectResult
		storyState = storyStateResult
	} else {
		// For other actions, just verify project ownership
		project = await prisma.project.findUnique({
			where: { id: projectId },
			select: { userId: true },
		})
	}

	if (!project) {
		return data({ error: 'Project not found' }, { status: 404 })
	}

	if (project.userId !== user.id) {
		return data({ error: 'Unauthorized' }, { status: 403 })
	}

	try {
		switch (actionData.type) {
			case 'transition': {
				const { storyId, action } = actionData

				// Validate the transition (storyState was fetched in parallel above)
				if (!storyState) {
					return data({ error: 'Story not found' }, { status: 404 })
				}
				if (!canTransition(storyState.state, action)) {
					return data({ error: `Invalid transition: cannot ${action} from ${storyState.state}` }, { status: 400 })
				}

				switch (action) {
					case 'start':
						await trackerDb.startStory(storyId)
						break
					case 'finish':
						await trackerDb.finishStory(storyId)
						break
					case 'deliver':
						await trackerDb.deliverStory(storyId)
						break
					case 'accept':
						await trackerDb.acceptStory(storyId)
						break
					case 'reject':
						await trackerDb.rejectStory(storyId)
						break
					case 'restart':
						await trackerDb.restartStory(storyId)
						break
				}
				break
			}
			case 'togglePriority': {
				await trackerDb.togglePriority(actionData.storyId)
				break
			}
			case 'moveToIteration': {
				const iterationId = actionData.iterationId === 'null' ? null : parseInt(actionData.iterationId, 10)
				await trackerDb.moveToIteration(actionData.storyId, iterationId)
				break
			}
			case 'create': {
				// Releases don't have points
				const points = actionData.storyType === 'release' ? null : actionData.points ? parseInt(actionData.points, 10) : null
				const iterationId =
					actionData.iterationId && actionData.iterationId !== 'null' ? parseInt(actionData.iterationId, 10) : null
				const storyData: Omit<Story, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'position' | 'comments' | 'commentCount'> & {
					id?: string
				} = {
					title: actionData.title,
					description: actionData.description ?? '',
					type: actionData.storyType,
					state: iterationId ? 'unstarted' : 'unscheduled',
					points,
					labels: [],
					priority: false,
					iteration: iterationId,
					deadline: actionData.storyType === 'release' && actionData.deadline ? actionData.deadline : null,
				}
				if (actionData.id) {
					storyData.id = actionData.id // Pass client-provided ID if present
				}
				await trackerDb.createStory(storyData)
				break
			}
			case 'delete': {
				await trackerDb.deleteStory(actionData.storyId)
				break
			}
			case 'update': {
				const updates: Parameters<typeof trackerDb.updateStory>[1] = {}
				if (actionData.title) updates.title = actionData.title
				if (actionData.description !== undefined) updates.description = actionData.description
				if (actionData.storyType) updates.type = actionData.storyType
				if (actionData.state) updates.state = actionData.state
				// Clear points if type is release (releases don't have points)
				if (actionData.storyType === 'release') {
					updates.points = null
				} else if (actionData.points !== undefined) {
					updates.points = actionData.points === '' ? null : parseInt(actionData.points, 10)
				}
				if (actionData.deadline !== undefined) {
					updates.deadline = actionData.deadline === '' ? null : actionData.deadline
				}
				await trackerDb.updateStory(actionData.storyId, updates)
				break
			}
			case 'addLabel': {
				await trackerDb.addLabelToStory(actionData.storyId, actionData.labelId)
				break
			}
			case 'removeLabel': {
				await trackerDb.removeLabelFromStory(actionData.storyId, actionData.labelId)
				break
			}
			case 'reorder': {
				// reorderStory already does ownership check internally via getStoryState
				const reorderedStory = await trackerDb.reorderStory(actionData.storyId, actionData.order, actionData.newIteration)
				if (!reorderedStory) {
					return data({ error: 'Story not found' }, { status: 404 })
				}
				break
			}
			case 'addComment': {
				// storyState was fetched in parallel above
				if (!storyState) {
					return data({ error: 'Story not found' }, { status: 404 })
				}
				await trackerDb.addComment(actionData.storyId, actionData.content)
				break
			}
			case 'getComments': {
				// Fetch comments for a story (lazy-loaded when story is expanded)
				const comments = await trackerDb.getStoryComments(actionData.storyId)
				return data({ success: true, comments })
			}
		}

		return data({ success: true })
	} catch (error) {
		return data({ error: error instanceof Error ? error.message : 'An error occurred' }, { status: 500 })
	}
}

// CRITICAL FIX #1: Move usePendingReorders hook outside component
function usePendingReorders() {
	const fetchers = useFetchers()
	return fetchers
		.filter(f => {
			// Only include if actively submitting (not idle)
			if (f.state === 'idle') return false
			if (!f.formData) return false
			try {
				const data = formDataToJson(f.formData)
				return data.type === 'reorder'
			} catch {
				return false
			}
		})
		.map(f => {
			const data = formDataToJson(f.formData!)
			return {
				storyId: data.storyId as string,
				order: Number(data.order),
				newIteration: data.newIteration === null ? null : Number(data.newIteration),
			}
		})
}

function usePendingCreates() {
	const fetchers = useFetchers()
	return fetchers
		.filter(f => {
			// Only include if actively submitting (not idle)
			if (f.state === 'idle') return false
			if (!f.formData) return false
			try {
				const data = formDataToJson(f.formData)
				return data.type === 'create'
			} catch {
				return false
			}
		})
		.map(f => {
			const data = formDataToJson(f.formData!)
			const iterationId =
				typeof data.iterationId === 'string' && data.iterationId !== 'null' ? parseInt(data.iterationId, 10) : null
			const storyType = data.storyType as 'feature' | 'bug' | 'chore' | 'release'
			return {
				id: data.id as string,
				number: 0, // Placeholder for optimistic UI - server will assign real number
				title: data.title as string,
				description: (data.description as string) || '',
				type: storyType,
				points: typeof data.points === 'string' ? parseInt(data.points, 10) : null,
				iteration: iterationId,
				state: iterationId ? ('unstarted' as const) : ('unscheduled' as const),
				labels: [],
				comments: [],
				commentCount: 0,
				priority: false,
				position: 999, // Will be at end
				deadline: storyType === 'release' && data.deadline ? (data.deadline as string) : null,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as Story
		})
}

function usePendingDeletes() {
	const fetchers = useFetchers()
	return fetchers
		.filter(f => {
			// Only include if actively submitting (not idle)
			if (f.state === 'idle') return false
			if (!f.formData) return false
			try {
				const data = formDataToJson(f.formData)
				return data.type === 'delete'
			} catch {
				return false
			}
		})
		.map(f => {
			const data = formDataToJson(f.formData!)
			return data.storyId as string
		})
}

function usePendingTransitions() {
	const fetchers = useFetchers()
	return fetchers
		.filter(f => {
			// Only include if actively submitting (not idle)
			if (f.state === 'idle') return false
			if (!f.formData) return false
			try {
				const data = formDataToJson(f.formData)
				return data.type === 'transition'
			} catch {
				return false
			}
		})
		.map(f => {
			const data = formDataToJson(f.formData!)
			return {
				storyId: data.storyId as string,
				action: data.action as string,
			}
		})
}

// Pending reorder type for state-based tracking
interface PendingReorder {
	storyId: string
	order: number
	newIteration: number | null
}

// Main Tracker Component
export default function Tracker() {
	const { currentStories, iceboxStories, doneStories, labels, stats, project, velocityData, initialExpandedStory } =
		useLoaderData<typeof loader>()

	const fetcher = useFetcher()
	// Local state for instant expand/collapse (no loader revalidation)
	// Initialize from loader data (parsed from ?story param server-side for SSR)
	const [expandedStoryNumber, setExpandedStoryNumber] = useState<number | null>(initialExpandedStory)

	// Auto-scroll to expanded story on initial load from URL param
	const initialStoryNumber = useRef(initialExpandedStory)
	useEffect(() => {
		if (initialStoryNumber.current === null) return
		const storyNumber = initialStoryNumber.current

		// Find the story element and scroll to it
		const allStories = [...currentStories, ...iceboxStories, ...doneStories]
		const story = allStories.find(s => s.number === storyNumber)
		if (story) {
			// Small delay to ensure DOM is rendered
			requestAnimationFrame(() => {
				const el = document.querySelector(`[data-story-number="${storyNumber}"]`)
				el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
			})
		}
		initialStoryNumber.current = null // Only run once
	}, [currentStories, iceboxStories, doneStories])

	// State-based pending reorders tracking (survives formData clearing during React Router's loading phase)
	const [pendingReordersMap, setPendingReordersMap] = useState<Map<string, PendingReorder>>(new Map())

	const pendingReordersFromFetchers = usePendingReorders()
	const pendingCreates = usePendingCreates()
	const pendingDeletes = usePendingDeletes()
	const pendingTransitions = usePendingTransitions()

	// Merge fetcher-based and state-based pending reorders
	// State-based persists through React Router's loading phase when formData is cleared
	const pendingReorders = useMemo(() => {
		const byStoryId = new Map<string, PendingReorder>()
		// State-based first (fallback)
		for (const [, reorder] of pendingReordersMap) {
			byStoryId.set(reorder.storyId, reorder)
		}
		// Fetcher-based overwrites (more current if available)
		for (const reorder of pendingReordersFromFetchers) {
			byStoryId.set(reorder.storyId, reorder)
		}
		return Array.from(byStoryId.values())
	}, [pendingReordersMap, pendingReordersFromFetchers])

	// Clear pending reorders when server data reflects the change
	// Strategy: Clear when the story is in the correct column (iteration) per server data
	// We trust server position after revalidation completes; exact position matching is fragile
	useEffect(() => {
		if (pendingReordersMap.size === 0) return

		const allServerStories = [...currentStories, ...iceboxStories]
		const serverByStoryId = new Map(allServerStories.map(s => [s.id, s]))

		const toRemove: string[] = []
		for (const [storyId, pending] of pendingReordersMap) {
			const serverStory = serverByStoryId.get(storyId)
			if (serverStory) {
				// Clear if story is in the correct column (null = icebox, non-null = current)
				// This is more reliable than exact position matching with floats
				const iterationMatches = serverStory.iteration === pending.newIteration
				if (iterationMatches) {
					toRemove.push(storyId)
				}
			}
		}

		if (toRemove.length > 0) {
			setPendingReordersMap(prev => {
				const next = new Map(prev)
				for (const id of toRemove) {
					next.delete(id)
				}
				return next
			})
		}
	}, [currentStories, iceboxStories, pendingReordersMap])

	// Also clear pending reorders when all fetchers are idle (handles errors and edge cases)
	const allFetchersIdle = useFetchers().every(f => f.state === 'idle')
	useEffect(() => {
		if (allFetchersIdle && pendingReordersMap.size > 0) {
			// All fetchers are done, server data is authoritative - clear all pending
			setPendingReordersMap(new Map())
		}
	}, [allFetchersIdle, pendingReordersMap])

	// Error feedback for failed requests
	const { toast } = useToast()
	const allFetchers = useFetchers()
	const shownErrorsRef = useRef<Set<string>>(new Set())

	useEffect(() => {
		for (const f of allFetchers) {
			// Check for error in fetcher data
			const errorData = f.data as { error?: string } | undefined
			if (f.state === 'idle' && errorData?.error) {
				if (!shownErrorsRef.current.has(errorData.error)) {
					shownErrorsRef.current.add(errorData.error)
					toast({
						title: 'Error',
						description: errorData.error,
						variant: 'destructive',
					})
					// Clear from shown errors after a delay to allow showing same error again later
					setTimeout(() => {
						shownErrorsRef.current.delete(errorData.error!)
					}, 5000)
				}
			}
		}
	}, [allFetchers, toast])

	// Map action to resulting state for optimistic transitions
	const ACTION_TO_STATE: Record<string, StoryState> = {
		start: 'started',
		finish: 'finished',
		deliver: 'delivered',
		accept: 'accepted',
		reject: 'rejected',
		restart: 'started',
	}

	// Map-based optimistic merge
	const { optimisticCurrentStories, optimisticIceboxStories, optimisticAcceptedStories } = useMemo(() => {
		// Include doneStories so accepted stories can be shown via the toggle
		const allStories = [...currentStories, ...iceboxStories, ...doneStories, ...pendingCreates]
		const byId = new Map(allStories.map(s => [s.id, s]))

		// Remove pending deletes
		for (const deletedId of pendingDeletes) {
			byId.delete(deletedId)
		}

		for (const pending of pendingReorders) {
			const story = byId.get(pending.storyId)
			if (story) {
				byId.set(pending.storyId, {
					...story,
					iteration: pending.newIteration,
					position: pending.order,
					// Cross-column drag: null iteration = icebox (unscheduled), non-null = current
					state: pending.newIteration === null ? 'unscheduled' : story.state === 'unscheduled' ? 'unstarted' : story.state,
				})
			}
		}

		// Apply pending state transitions optimistically (keep position unchanged)
		for (const pending of pendingTransitions) {
			const story = byId.get(pending.storyId)
			const newState = ACTION_TO_STATE[pending.action]
			if (story && newState) {
				byId.set(pending.storyId, {
					...story,
					state: newState,
				})
			}
		}

		const updated = Array.from(byId.values())

		// Sort current stories by position, then by ID for stability when positions are equal
		const currentFiltered = updated.filter(s => ['unstarted', 'started', 'finished', 'delivered', 'rejected'].includes(s.state))
		const currentSorted = currentFiltered.sort((a, b) => {
			const posDiff = a.position - b.position
			if (posDiff !== 0) return posDiff
			return a.id.localeCompare(b.id) // Stable secondary sort
		})

		// Accepted stories (from current iteration) - shown via toggle
		const acceptedFiltered = updated.filter(s => s.state === 'accepted' && s.iteration !== null)
		const acceptedSorted = acceptedFiltered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) // Most recent first

		return {
			// Current: sorted by state priority, then position
			optimisticCurrentStories: currentSorted,
			// Icebox: unscheduled only, sorted by position (with stable secondary sort by ID)
			optimisticIceboxStories: updated
				.filter(s => s.state === 'unscheduled')
				.sort((a, b) => {
					const posDiff = a.position - b.position
					if (posDiff !== 0) return posDiff
					return a.id.localeCompare(b.id)
				}),
			// Accepted: for the "Show X accepted stories" toggle
			optimisticAcceptedStories: acceptedSorted,
		}
	}, [currentStories, iceboxStories, doneStories, pendingCreates, pendingReorders, pendingDeletes, pendingTransitions])

	const [activeView, setActiveView] = useState<'current' | 'icebox' | 'done'>('current')
	// Mobile tab for switching between Current and Icebox
	const [mobileTab, setMobileTab] = useState<'current' | 'icebox'>('current')
	// Velocity for iteration planning (React state only - resets on refresh)
	const [velocity, setVelocity] = useState(project.velocity)
	// Mobile drawer state
	const [drawerOpen, setDrawerOpen] = useState(false)
	// Collapsed iterations
	const [collapsedIterations, setCollapsedIterations] = useState<Set<number>>(new Set())
	// Toggle for showing accepted stories in Current column
	const [showAccepted, setShowAccepted] = useState(false)
	// Velocity report view state
	const [showVelocityView, setShowVelocityView] = useState(false)

	// Keyboard shortcut: 'A' to add new story (like Pivotal Tracker)
	useKeyboardShortcut(
		'a',
		useCallback(() => setShowAddDialog(true), []),
	)

	// Group current stories into iterations based on velocity
	const iterations = useMemo(() => {
		return groupStoriesIntoIterations(optimisticCurrentStories, {
			velocity,
			iterationLengthDays: project.iterationLength,
			projectStartDate: project.startDate,
		})
	}, [optimisticCurrentStories, velocity, project.iterationLength, project.startDate])

	// Flatten visible iterations into a list for SortableContext and drag calculations
	// This ensures dnd-kit's item order matches DOM order (skipping collapsed iterations)
	const visibleCurrentStories = useMemo(() => {
		const visible: Story[] = []
		for (const iteration of iterations) {
			if (!collapsedIterations.has(iteration.index)) {
				visible.push(...iteration.stories)
			}
		}
		return visible
	}, [iterations, collapsedIterations])

	// Calculate release risks for all release stories
	const releaseRisks = useMemo(() => {
		const risks = new Map<string, ReleaseRisk>()
		for (const story of [...optimisticCurrentStories, ...optimisticIceboxStories]) {
			if (story.type === 'release') {
				const releaseIteration = findReleaseIteration(story, iterations)
				if (releaseIteration) {
					const risk = calculateReleaseRisk(story, releaseIteration.endDate, project.iterationLength)
					risks.set(story.id, risk)
				} else {
					// Story in icebox - no iteration, default to on-track
					risks.set(story.id, 'on-track')
				}
			}
		}
		return risks
	}, [optimisticCurrentStories, optimisticIceboxStories, iterations, project.iterationLength])

	// Toggle iteration collapse
	const toggleIterationCollapse = (index: number) => {
		setCollapsedIterations(prev => {
			const next = new Set(prev)
			if (next.has(index)) {
				next.delete(index)
			} else {
				next.add(index)
			}
			return next
		})
	}
	const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set())
	const [copyButtonText, setCopyButtonText] = useState('Copy for LLM')
	const [showAddDialog, setShowAddDialog] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [activeStory, setActiveStory] = useState<Story | null>(null)

	// Ref for story elements
	const storyRefs = useRef<Map<string, HTMLDivElement>>(new Map())

	// Build set of icebox story IDs for drag detection
	const iceboxStoryIds = useMemo(() => new Set(optimisticIceboxStories.map(s => s.id)), [optimisticIceboxStories])

	// DnD sensors - require some movement before starting drag
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
		useSensor(TouchSensor, {
			activationConstraint: {
				delay: 250, // Hold 250ms to start drag - allows scroll to work
				tolerance: 5, // Allow 5px movement during delay
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	)

	// Handle expanding a story (instant via local state)
	const handleExpandStory = (storyNumber: number | null) => {
		setExpandedStoryNumber(storyNumber)
	}

	const handleSelectStory = (id: string, multi: boolean) => {
		setSelectedStories(prev => {
			const next = new Set(prev)
			if (next.has(id)) {
				next.delete(id)
			} else {
				if (!multi) {
					next.clear()
				}
				next.add(id)
			}
			return next
		})
	}

	const deselectAll = () => setSelectedStories(new Set())

	// Format stories as markdown for LLM export
	const formatStoriesForLLM = (stories: Story[]): string => {
		// Sort by story number for predictable output
		const sortedStories = [...stories].sort((a, b) => a.number - b.number)

		const lines: string[] = [`# Selected Stories (${sortedStories.length})`, '']

		for (const story of sortedStories) {
			lines.push(`## #${story.number}: ${story.title}`)

			// Build the info line with required fields
			const infoParts = [`**Type:** ${story.type}`, `**State:** ${story.state}`]

			// Add optional fields only if present/truthy
			if (story.points !== null) {
				infoParts.push(`**Points:** ${story.points}`)
			}
			if (story.priority) {
				infoParts.push(`**Priority:** yes`)
			}
			lines.push(infoParts.join(' | '))

			// Labels - only if non-empty
			if (story.labels.length > 0) {
				lines.push(`**Labels:** ${story.labels.map(l => l.name).join(', ')}`)
			}

			// Deadline - only if present
			if (story.deadline) {
				lines.push(`**Deadline:** ${story.deadline}`)
			}

			// Description - only if non-empty
			if (story.description.trim()) {
				lines.push('')
				lines.push(story.description.trim())
			}

			lines.push('')
			lines.push('---')
			lines.push('')
		}

		// Remove trailing separator and empty lines
		while (lines.length > 0 && (lines[lines.length - 1] === '' || lines[lines.length - 1] === '---')) {
			lines.pop()
		}

		return lines.join('\n')
	}

	// Copy selected stories to clipboard for LLM
	const handleCopyForLLM = async () => {
		// Gather all stories from all sources
		const allStories = [...currentStories, ...iceboxStories, ...doneStories]
		const selectedStoryObjects = allStories.filter(s => selectedStories.has(s.id))

		if (selectedStoryObjects.length === 0) {
			toast({
				title: 'No stories to copy',
				description: 'Select some stories first',
				variant: 'destructive',
			})
			return
		}

		const markdown = formatStoriesForLLM(selectedStoryObjects)

		try {
			await navigator.clipboard.writeText(markdown)
			setCopyButtonText('Copied!')
			toast({
				title: 'Copied to clipboard',
				description: `${selectedStoryObjects.length} ${selectedStoryObjects.length === 1 ? 'story' : 'stories'} copied as markdown`,
			})

			// Revert button text after 2 seconds
			setTimeout(() => {
				setCopyButtonText('Copy for LLM')
			}, 2000)
		} catch (error) {
			toast({
				title: 'Failed to copy',
				description: 'Could not access clipboard. Please try again.',
				variant: 'destructive',
			})
		}
	}

	// Helper to get ref callback for a story
	// Issue #16: Clean up refs when stories are deleted
	const getStoryRef = (storyId: string) => (el: HTMLDivElement | null) => {
		if (el) {
			storyRefs.current.set(storyId, el)
		} else {
			storyRefs.current.delete(storyId)
		}
	}

	// Issue #16: Clean up refs for deleted stories
	useEffect(() => {
		const allStoryIds = new Set([
			...currentStories.map(s => s.id),
			...iceboxStories.map(s => s.id),
			...doneStories.map(s => s.id),
		])

		// Remove refs for stories that no longer exist
		for (const storyId of storyRefs.current.keys()) {
			if (!allStoryIds.has(storyId)) {
				storyRefs.current.delete(storyId)
			}
		}
	}, [currentStories, iceboxStories, doneStories])

	// Filter stories by search
	const filterStories = (stories: Story[]) => {
		if (!searchQuery) return stories
		const query = searchQuery.toLowerCase()
		return stories.filter(s => s.title.toLowerCase().includes(query) || s.labels.some(l => l.name.toLowerCase().includes(query)))
	}

	// DnD handlers
	// Issue #19: Add proper type guards instead of `as` assertions
	const handleDragStart = (event: DragStartEvent) => {
		const storyData = event.active.data.current?.story
		if (storyData && typeof storyData === 'object' && 'id' in storyData) {
			setActiveStory(storyData as Story)
		} else {
			setActiveStory(null)
		}
	}

	const handleDragEnd = (event: DragEndEvent) => {
		setActiveStory(null)

		const { over } = event
		if (!over) {
			return
		}

		const storyId = event.active.id as string
		const overId = over.id as string

		// Determine which column the drop target is in
		// Target is icebox if:
		// 1. Dropped on 'icebox-column' directly
		// 2. Dropped on a story that's in icebox
		const isTargetIcebox = overId === 'icebox-column' || iceboxStoryIds.has(overId)

		// Use iteration 1 for current, null for icebox
		// This is a simplification - we use iteration as a proxy for which column
		const newIteration = isTargetIcebox ? null : 1
		let order = 0

		if (overId === 'current-column') {
			// Dropped on empty current column area
			const lastStory = visibleCurrentStories[visibleCurrentStories.length - 1]
			order = lastStory ? lastStory.position + 1 : 0
		} else if (overId === 'icebox-column') {
			// Dropped on empty icebox column area
			const lastStory = optimisticIceboxStories[optimisticIceboxStories.length - 1]
			order = lastStory ? lastStory.position + 1 : 0
		} else if (overId === 'done-column') {
			// Can't drop on done column
			return
		} else {
			// Dropped on another story - calculate position relative to that story
			const allStories = [...visibleCurrentStories, ...optimisticIceboxStories]
			const overStory = allStories.find(s => s.id === overId)
			if (overStory) {
				const columnStoriesRaw = isTargetIcebox ? optimisticIceboxStories : visibleCurrentStories
				const columnStories = columnStoriesRaw.filter(s => s.id !== storyId)
				const overIndex = columnStories.findIndex(s => s.id === overId)

				// Check if moving down (dragged story was above the over story)
				const draggedStory = allStories.find(s => s.id === storyId)
				// When dragging between columns, positions aren't comparable
				// Default to inserting AFTER the hovered item for cross-column drags
				const isCrossColumnDrag = draggedStory && draggedStory.iteration !== overStory.iteration
				const isMovingDown = isCrossColumnDrag
					? true // Cross-column: always insert after the hovered item
					: draggedStory && draggedStory.position < overStory.position

				if (isMovingDown) {
					// Moving DOWN: insert AFTER the over item
					const nextStory = columnStories[overIndex + 1]
					if (nextStory && nextStory.position > overStory.position) {
						// Next story has a different position - use midpoint
						order = (overStory.position + nextStory.position) / 2
					} else {
						// No next story, or next story has same position - add delta
						order = overStory.position + 1
					}
				} else {
					// Moving UP: insert BEFORE the over item
					if (overIndex === 0) {
						order = overStory.position - 1
					} else {
						const prevStory = columnStories[overIndex - 1]
						if (prevStory.position < overStory.position) {
							// Prev story has a different position - use midpoint
							order = (prevStory.position + overStory.position) / 2
						} else {
							// Prev story has same position - subtract delta
							order = overStory.position - 1
						}
					}
				}
			}
		}

		// Skip no-op drags (same position and iteration)
		const currentStory = [...optimisticCurrentStories, ...optimisticIceboxStories].find(s => s.id === storyId)
		if (currentStory && currentStory.position === order && currentStory.iteration === newIteration) {
			return
		}

		// Store in state-based map BEFORE submitting (survives formData clearing)
		setPendingReordersMap(prev => {
			const next = new Map(prev)
			next.set(storyId, { storyId, order, newIteration })
			return next
		})

		// Submit reorder action
		fetcher.submit(
			jsonToFormData({
				type: 'reorder',
				storyId,
				order,
				newIteration,
			}),
			{ method: 'POST' },
		)

		// Mobile: auto-switch tab to follow the dragged story
		if (typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches) {
			if (isTargetIcebox && mobileTab === 'current') {
				setMobileTab('icebox')
			} else if (!isTargetIcebox && mobileTab === 'icebox') {
				setMobileTab('current')
			}
		}
	}

	const handleDragCancel = () => {
		setActiveStory(null)
	}

	return (
		<DndContext
			id='tracker-dnd'
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDragCancel={handleDragCancel}
		>
			<div className="h-screen flex bg-slate-950 text-slate-200 overflow-hidden font-['JetBrains_Mono',_'SF_Mono',_'Fira_Code',_monospace]">
				{/* Selection Bar */}
				{selectedStories.size > 0 && (
					<div className='fixed top-0 left-0 right-0 z-50 flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 bg-blue-900/95 border-b border-blue-700 backdrop-blur-sm'>
						<span className='text-sm font-medium text-blue-100'>
							{selectedStories.size} {selectedStories.size === 1 ? 'story' : 'stories'} selected
						</span>
						<Button size='sm' variant='ghost' onClick={deselectAll} className='text-blue-200 hover:text-white hover:bg-blue-800'>
							Deselect All
						</Button>
						<div className='flex-1' />
						<Button
							size='sm'
							variant='ghost'
							onClick={handleCopyForLLM}
							className='text-blue-200 hover:text-white hover:bg-blue-800'
						>
							{copyButtonText}
						</Button>
					</div>
				)}

				{/* Left Sidebar - hidden on mobile */}
				<div className='hidden md:block'>
					<Sidebar
						projectName={project.name}
						activeView={activeView}
						onViewChange={setActiveView}
						onAddStory={() => setShowAddDialog(true)}
						onVelocityClick={() => setShowVelocityView(true)}
						stats={stats}
						labelsCount={labels.length}
					/>
				</div>

				{/* Mobile Drawer */}
				<MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
					<Sidebar
						projectName={project.name}
						activeView={activeView}
						onViewChange={setActiveView}
						onAddStory={() => setShowAddDialog(true)}
						onVelocityClick={() => setShowVelocityView(true)}
						stats={stats}
						labelsCount={labels.length}
						onNavigate={() => setDrawerOpen(false)}
					/>
				</MobileDrawer>

				{/* Main Content */}
				<div className='flex-1 flex flex-col overflow-hidden'>
					{/* Mobile Header with hamburger */}
					<div className='md:hidden flex items-center gap-3 px-3 py-2 border-b border-slate-700 bg-slate-900'>
						<button
							onClick={() => setDrawerOpen(true)}
							className='p-1.5 hover:bg-slate-700 rounded transition-colors'
							aria-label='Open navigation menu'
						>
							<Menu className='h-5 w-5 text-slate-300' />
						</button>
						<span className='text-sm font-semibold text-slate-100'>Tracker</span>
					</div>

					{/* Mobile Tabs - only visible on mobile when in current view */}
					{activeView === 'current' && (
						<div className='md:hidden flex border-b border-slate-700 bg-slate-900'>
							<button
								onClick={() => setMobileTab('current')}
								className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
									mobileTab === 'current' ? 'text-slate-100 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'
								}`}
							>
								Current ({optimisticCurrentStories.length})
							</button>
							<button
								onClick={() => setMobileTab('icebox')}
								className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
									mobileTab === 'icebox' ? 'text-slate-100 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'
								}`}
							>
								Icebox ({optimisticIceboxStories.length})
							</button>
						</div>
					)}

					<div className='flex-1 flex gap-2 overflow-hidden'>
						{/* Current + Icebox side by side - Desktop shows both, Mobile shows based on tab */}
						{activeView === 'current' && (
							<>
								{/* Current Column */}
								<div
									className={`flex-1 sm:flex-none sm:w-1/2 border-r-2 border-slate-700 flex flex-col bg-slate-900/50 ${
										mobileTab === 'current' ? 'flex' : 'hidden sm:flex'
									}`}
								>
									<div className='flex items-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-900'>
										<span className='text-sm font-semibold text-slate-200'>Current</span>
										<VelocityControl velocity={velocity} onChange={setVelocity} />
										<div className='flex-1' />
										<span className='text-xs text-slate-500'>Pts: {stats.currentPoints}</span>
										<Plus
											className='h-4 w-4 text-slate-500 cursor-pointer hover:text-slate-300'
											onClick={() => setShowAddDialog(true)}
											aria-label='Add story'
										/>
									</div>

									<div className='flex-1 overflow-y-auto'>
										{/* Show accepted stories toggle */}
										{optimisticAcceptedStories.length > 0 && (
											<button
												onClick={() => setShowAccepted(!showAccepted)}
												aria-expanded={showAccepted}
												className='w-full px-3 py-1.5 text-xs text-left text-green-400 hover:bg-green-900/20 border-b border-slate-700/50 transition-colors'
											>
												{showAccepted ? 'Hide' : 'Show'}{' '}
												{searchQuery ? filterStories(optimisticAcceptedStories).length : optimisticAcceptedStories.length}{' '}
												accepted {optimisticAcceptedStories.length === 1 ? 'story' : 'stories'}
											</button>
										)}

										{/* Accepted stories (when expanded) */}
										{showAccepted &&
											filterStories(optimisticAcceptedStories).map(story => (
												<div key={story.id} ref={getStoryRef(story.id)} data-story-number={story.number} className='opacity-75'>
													<StoryCard
														story={story}
														isSelected={selectedStories.has(story.id)}
														onSelect={handleSelectStory}
														isExpanded={expandedStoryNumber === story.number}
														onExpand={handleExpandStory}
														allLabels={labels}
														isOptimistic={
															pendingReorders.some(p => p.storyId === story.id) ||
															pendingTransitions.some(p => p.storyId === story.id)
														}
													/>
												</div>
											))}

										<DroppableColumn id='current-column' stories={visibleCurrentStories}>
											{iterations.length > 0 ? (
												iterations.map(iteration => (
													<div key={iteration.index}>
														<IterationHeader
															iteration={iteration}
															isCollapsed={collapsedIterations.has(iteration.index)}
															onToggleCollapse={() => toggleIterationCollapse(iteration.index)}
														/>
														{!collapsedIterations.has(iteration.index) && (
															<>
																{filterStories(iteration.stories).length > 0 ? (
																	filterStories(iteration.stories).map(story => (
																		<div key={story.id} ref={getStoryRef(story.id)} data-story-number={story.number}>
																			<StoryCard
																				story={story}
																				isSelected={selectedStories.has(story.id)}
																				onSelect={handleSelectStory}
																				isExpanded={expandedStoryNumber === story.number}
																				onExpand={handleExpandStory}
																				allLabels={labels}
																				isOptimistic={
																					pendingReorders.some(p => p.storyId === story.id) ||
																					pendingTransitions.some(p => p.storyId === story.id)
																				}
																				releaseRisk={story.type === 'release' ? releaseRisks.get(story.id) : undefined}
																			/>
																		</div>
																	))
																) : (
																	<div className='px-3 py-2 text-xs text-slate-500 italic'>No stories</div>
																)}
															</>
														)}
													</div>
												))
											) : (
												<div className='p-4 text-center text-sm text-slate-500'>
													No stories in current. Drag from Icebox to start.
												</div>
											)}
										</DroppableColumn>
									</div>
								</div>

								{/* Icebox Column */}
								<div
									className={`flex-1 sm:flex-none sm:w-1/2 flex flex-col bg-slate-900/30 ${
										mobileTab === 'icebox' ? 'flex' : 'hidden sm:flex'
									}`}
								>
									<div className='flex items-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-900'>
										<span className='text-sm font-semibold text-slate-200'>Icebox</span>
										<span className='text-xs text-slate-500'>{optimisticIceboxStories.length}</span>
										<div className='flex-1' />
										<div className='relative'>
											<Search className='absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500' />
											<input
												type='text'
												placeholder='Search'
												value={searchQuery}
												onChange={e => setSearchQuery(e.target.value)}
												className='w-full sm:w-36 pl-7 pr-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600'
											/>
										</div>
										<Plus
											className='h-4 w-4 text-slate-500 cursor-pointer hover:text-slate-300'
											onClick={() => setShowAddDialog(true)}
											aria-label='Add story'
										/>
									</div>

									<div className='flex-1 overflow-y-auto'>
										<DroppableColumn id='icebox-column' stories={optimisticIceboxStories}>
											{filterStories(optimisticIceboxStories).map(story => (
												<div key={story.id} ref={getStoryRef(story.id)} data-story-number={story.number}>
													<StoryCard
														story={story}
														isSelected={selectedStories.has(story.id)}
														onSelect={handleSelectStory}
														isExpanded={expandedStoryNumber === story.number}
														onExpand={handleExpandStory}
														allLabels={labels}
														isOptimistic={
															pendingReorders.some(p => p.storyId === story.id) ||
															pendingTransitions.some(p => p.storyId === story.id)
														}
														releaseRisk={story.type === 'release' ? releaseRisks.get(story.id) : undefined}
													/>
												</div>
											))}
											{optimisticIceboxStories.length === 0 && (
												<div className='p-4 text-center text-sm text-slate-500'>No stories in icebox</div>
											)}
										</DroppableColumn>
									</div>
								</div>
							</>
						)}

						{/* Standalone Icebox View (from sidebar) */}
						{activeView === 'icebox' && (
							<div className='flex-1 flex flex-col bg-slate-900/30 overflow-hidden'>
								<div className='flex items-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-900'>
									<span className='text-sm font-semibold text-slate-200'>Icebox</span>
									<span className='text-xs text-slate-500'>{optimisticIceboxStories.length}</span>
									<div className='flex-1' />
									<div className='relative'>
										<Search className='absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500' />
										<input
											type='text'
											placeholder='Search icebox'
											value={searchQuery}
											onChange={e => setSearchQuery(e.target.value)}
											className='w-full sm:w-48 pl-7 pr-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600'
										/>
									</div>
									<Plus
										className='h-4 w-4 text-slate-500 cursor-pointer hover:text-slate-300'
										onClick={() => setShowAddDialog(true)}
										aria-label='Add story'
									/>
								</div>

								<div className='flex-1 overflow-y-auto'>
									<DroppableColumn id='icebox-column' stories={optimisticIceboxStories}>
										{filterStories(optimisticIceboxStories).map(story => (
											<div key={story.id} ref={getStoryRef(story.id)} data-story-number={story.number}>
												<StoryCard
													story={story}
													isSelected={selectedStories.has(story.id)}
													onSelect={handleSelectStory}
													isExpanded={expandedStoryNumber === story.number}
													onExpand={handleExpandStory}
													allLabels={labels}
													isOptimistic={
														pendingReorders.some(p => p.storyId === story.id) ||
														pendingTransitions.some(p => p.storyId === story.id)
													}
													releaseRisk={story.type === 'release' ? releaseRisks.get(story.id) : undefined}
												/>
											</div>
										))}
										{optimisticIceboxStories.length === 0 && (
											<div className='p-4 text-center text-sm text-slate-500'>No stories in icebox</div>
										)}
									</DroppableColumn>
								</div>
							</div>
						)}

						{/* Done Column */}
						{activeView === 'done' && (
							<div className='flex-1 flex flex-col bg-slate-900/30 overflow-hidden'>
								<div className='flex items-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-900'>
									<span className='text-sm font-semibold text-slate-200'>Done</span>
									<span className='text-xs text-slate-500'>{doneStories.length}</span>
									<div className='flex-1' />
									<div className='relative'>
										<Search className='absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500' />
										<input
											type='text'
											placeholder='Search done'
											value={searchQuery}
											onChange={e => setSearchQuery(e.target.value)}
											className='w-full sm:w-48 pl-7 pr-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600'
										/>
									</div>
								</div>

								<div className='flex-1 overflow-y-auto'>
									<DroppableColumn id='done-column' stories={doneStories}>
										{filterStories(doneStories).map(story => (
											<div key={story.id} ref={getStoryRef(story.id)} data-story-number={story.number}>
												<StoryCard
													story={story}
													isSelected={selectedStories.has(story.id)}
													onSelect={handleSelectStory}
													isExpanded={expandedStoryNumber === story.number}
													onExpand={handleExpandStory}
													allLabels={labels}
												/>
											</div>
										))}
										{doneStories.length === 0 && (
											<div className='p-4 text-center text-sm text-slate-500'>No completed stories</div>
										)}
									</DroppableColumn>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Add Story Dialog - stories go to icebox by default */}
				<AddStoryDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
			</div>

			{/* Drag Overlay - shows dragged item */}
			<DragOverlay dropAnimation={null}>
				{activeStory && <StoryCard story={activeStory} allLabels={labels} isDragOverlay />}
			</DragOverlay>

			{/* Velocity View Modal */}
			<VelocityView
				data={velocityData}
				targetVelocity={project.velocity}
				open={showVelocityView}
				onOpenChange={setShowVelocityView}
			/>
		</DndContext>
	)
}
