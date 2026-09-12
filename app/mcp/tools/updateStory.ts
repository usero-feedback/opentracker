import { z } from 'zod'
import { createTrackerDb, type StoryState } from '~/utils/tracker-db.server'
import {
	labelNamesArg,
	pointsArg,
	projectIdArg,
	requireProjectAccess,
	resolveLabels,
	serializeStory,
	storyIdArg,
	storyStateArg,
	storyTypeArg,
} from '../access'
import { defineTool } from '../types'

export const updateStory = defineTool({
	name: 'update_story',
	description:
		'Edit a story: any subset of title, description, type, points, labels (replaces the full set) and state. A state change uses the same transition the board buttons use, so the story moves to the same column position the UI would give it: started, finished, delivered and rejected go to the top of their group, accepted goes to Done. Intermediate states are not required (unstarted to finished is fine). Returns the updated story.',
	inputSchema: {
		projectId: projectIdArg,
		storyId: storyIdArg,
		title: z.string().trim().min(1).max(500).optional(),
		description: z.string().max(20_000).optional(),
		type: storyTypeArg.optional(),
		points: pointsArg.nullable().optional().describe('1, 2, 4 or 8; null clears the estimate.'),
		labels: labelNamesArg.optional().describe('The complete new label set; [] removes all labels.'),
		state: storyStateArg
			.optional()
			.describe(
				'Target state. started = work begun, finished = done, delivered = ready for review, accepted/rejected = reviewed.',
			),
	},
	readOnly: false,
	handler: async (args, ctx) => {
		const access = await requireProjectAccess(ctx, args.projectId)
		if (!access.ok) return { error: access.error }
		const { projectId, storyId, state, labels: labelNames, ...fields } = args
		if (Object.values({ state, labelNames, ...fields }).every(v => v === undefined)) {
			return { error: 'Nothing to update: pass at least one of title, description, type, points, labels or state.' }
		}
		const db = createTrackerDb(ctx.prisma, projectId)
		const current = await db.getStoryById(storyId)
		if (!current) return { error: `Story ${storyId} not found in project ${projectId}.` }

		const type = fields.type ?? current.type
		if (type === 'release' && (fields.points ?? null) !== null)
			return { error: 'Releases cannot have points. Pass points: null or change the type.' }

		const updates: Parameters<typeof db.updateStory>[1] = {}
		if (fields.title !== undefined) updates.title = fields.title
		if (fields.description !== undefined) updates.description = fields.description
		if (fields.type !== undefined) updates.type = fields.type
		// Same rule as the edit form: switching to release clears points.
		if (fields.type === 'release') updates.points = null
		else if (fields.points !== undefined) updates.points = fields.points
		if (labelNames !== undefined) {
			const resolved = await resolveLabels(ctx, projectId, labelNames)
			if (!resolved.ok) return { error: resolved.error }
			updates.labels = resolved.labels
		}
		if (Object.keys(updates).length > 0) await db.updateStory(storyId, updates)

		if (state !== undefined && state !== current.state) await transition(db, storyId, state)

		const story = await db.getStoryById(storyId)
		if (!story) return { error: `Story ${storyId} disappeared during update.` }
		return { ok: serializeStory(ctx, projectId, story, false) }
	},
})

/** Same methods the board's transition action calls; unscheduled/unstarted are set directly, as the edit form does. */
async function transition(db: ReturnType<typeof createTrackerDb>, storyId: string, state: StoryState): Promise<void> {
	switch (state) {
		case 'started':
			await db.startStory(storyId)
			return
		case 'finished':
			await db.finishStory(storyId)
			return
		case 'delivered':
			await db.deliverStory(storyId)
			return
		case 'accepted':
			await db.acceptStory(storyId)
			return
		case 'rejected':
			await db.rejectStory(storyId)
			return
		case 'unstarted':
		case 'unscheduled':
			await db.updateStory(storyId, { state })
			return
	}
}
