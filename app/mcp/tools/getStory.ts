import { createTrackerDb } from '~/utils/tracker-db.server'
import { projectIdArg, requireProjectAccess, serializeStory, storyIdArg } from '../access'
import { defineTool } from '../types'

export const getStory = defineTool({
	name: 'get_story',
	description: 'One story in full: fields, label names and every comment in order.',
	inputSchema: { projectId: projectIdArg, storyId: storyIdArg },
	readOnly: true,
	handler: async (args, ctx) => {
		const access = await requireProjectAccess(ctx, args.projectId)
		if (!access.ok) return { error: access.error }
		const story = await createTrackerDb(ctx.prisma, args.projectId).getStoryById(args.storyId)
		if (!story) return { error: `Story ${args.storyId} not found in project ${args.projectId}.` }
		return { ok: serializeStory(ctx, args.projectId, story, true) }
	},
})
