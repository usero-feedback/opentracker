import { z } from 'zod'
import { createTrackerDb } from '~/utils/tracker-db.server'
import {
	labelNamesArg,
	pointsArg,
	projectIdArg,
	requireProjectAccess,
	resolveLabels,
	serializeStory,
	storyTypeArg,
} from '../access'
import { defineTool } from '../types'

export const createStory = defineTool({
	name: 'create_story',
	description:
		'Create a story. It lands in the icebox (state "unscheduled", no iteration), same as the REST API; use update_story to start it. Releases cannot carry points. Returns the story with its URL.',
	inputSchema: {
		projectId: projectIdArg,
		title: z.string().trim().min(1).max(500),
		description: z.string().max(20_000).default('').describe('Markdown body. Empty string for none.'),
		type: storyTypeArg.default('feature'),
		points: pointsArg.optional().describe('Estimate: 1, 2, 4 or 8. Omit for unestimated.'),
		labels: labelNamesArg.default([]),
		deadline: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/)
			.optional()
			.describe('YYYY-MM-DD, releases only.'),
	},
	readOnly: false,
	handler: async (args, ctx) => {
		const access = await requireProjectAccess(ctx, args.projectId)
		if (!access.ok) return { error: access.error }
		if (args.type === 'release' && args.points !== undefined)
			return { error: 'Releases cannot have points. Drop points or change the type.' }
		if (args.type !== 'release' && args.deadline !== undefined) return { error: 'Only releases can have a deadline.' }

		const labels = await resolveLabels(ctx, args.projectId, args.labels)
		if (!labels.ok) return { error: labels.error }

		const story = await createTrackerDb(ctx.prisma, args.projectId).createStory({
			title: args.title,
			description: args.description,
			type: args.type,
			state: 'unscheduled',
			points: args.points ?? null,
			priority: false,
			iteration: null,
			labels: labels.labels,
			deadline: args.deadline ?? null,
		})
		return { ok: serializeStory(ctx, args.projectId, story, false) }
	},
})
