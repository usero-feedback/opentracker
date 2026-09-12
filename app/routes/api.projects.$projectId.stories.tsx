import type { ActionFunctionArgs } from 'react-router'
import { data } from 'react-router'
import { z } from 'zod'
import { pointsArg, storyTypeArg } from '~/mcp/access'
import { requireApiUser } from '~/utils/api-auth.server'
import { getPrisma } from '~/utils/db.server'
import { createTrackerDb } from '~/utils/tracker-db.server'

// Request schema
const CreateStorySchema = z.object({
	title: z.string().min(1, 'Title is required'),
	description: z.string().optional(),
	type: storyTypeArg.optional(),
	labels: z.array(z.string()).optional(),
	points: pointsArg.optional(),
})

// Response schema
interface CreateStoryResponse {
	id: string
	number: number
	url: string
	title: string
}

export async function action({ params, request, context }: ActionFunctionArgs) {
	// Only allow POST requests
	if (request.method !== 'POST') {
		return data({ error: 'Method not allowed' }, { status: 405 })
	}

	try {
		// Authenticate using API key
		const apiUser = await requireApiUser(request, context)

		// Get and validate projectId
		const { projectId } = params
		if (!projectId) {
			return data({ error: 'Project ID is required' }, { status: 400 })
		}

		const prisma = getPrisma({ context })

		// Verify user owns this project
		// Include userId in the where clause to avoid leaking project existence
		const project = await prisma.project.findUnique({
			where: {
				id: projectId,
			},
			select: { userId: true },
		})

		// Always return 404 to avoid leaking whether project exists
		if (!project || project.userId !== apiUser.id) {
			return data({ error: 'Project not found' }, { status: 404 })
		}

		// Parse request body
		const body = await request.json()
		const parsed = CreateStorySchema.parse(body)

		// Resolve label IDs from label names
		const labelIds: string[] = []
		if (parsed.labels && parsed.labels.length > 0) {
			const labels = await prisma.label.findMany({
				where: {
					projectId,
					name: { in: parsed.labels },
				},
				select: { id: true, name: true },
			})

			// Map label names to IDs
			labelIds.push(...labels.map(l => l.id))

			// Warn if some labels weren't found (optional, could also create them)
			if (labels.length !== parsed.labels.length) {
				const foundNames = new Set(labels.map(l => l.name))
				const missingLabels = parsed.labels.filter(name => !foundNames.has(name))
				console.warn(`Labels not found: ${missingLabels.join(', ')}`)
			}
		}

		// Create story using tracker DB
		const trackerDb = createTrackerDb(prisma, projectId)
		const story = await trackerDb.createStory({
			title: parsed.title,
			description: parsed.description ?? '',
			type: parsed.type ?? 'feature',
			state: 'unscheduled', // API-created stories go to icebox
			points: parsed.points ?? null,
			priority: false,
			iteration: null, // Icebox
			labels: labelIds.map(id => ({ id, name: '', color: '' })), // Just need IDs for creation
			deadline: null,
		})

		// Get the dashboard URL from environment
		const dashboardUrl = context.cloudflare.env.DASHBOARD_URL || 'http://localhost:5173'

		// Build response
		const response: CreateStoryResponse = {
			id: story.id,
			number: story.number,
			url: `${dashboardUrl}/tracker/${projectId}?story=${story.number}`,
			title: story.title,
		}

		return data(response, {
			status: 201,
			headers: {
				'Content-Type': 'application/json',
			},
		})
	} catch (error) {
		// 401/429 from the auth helper are already the intended response.
		if (error instanceof Response) throw error
		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			return data(
				{
					error: 'Validation error',
					details: error.issues,
				},
				{ status: 400 },
			)
		}

		// Handle other errors
		console.error('Error creating story:', error)
		return data(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			{ status: 500 },
		)
	}
}
