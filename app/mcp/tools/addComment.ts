import { z } from 'zod'
import { createTrackerDb } from '~/utils/tracker-db.server'
import { projectIdArg, requireProjectAccess, storyIdArg, storyUrl } from '../access'
import { defineTool } from '../types'

export const addComment = defineTool({
	name: 'add_comment',
	description: 'Add a comment to a story (markdown). Good for progress notes, links to commits or PRs, and review findings.',
	inputSchema: {
		projectId: projectIdArg,
		storyId: storyIdArg,
		content: z.string().trim().min(1).max(20_000),
	},
	readOnly: false,
	handler: async (args, ctx) => {
		const access = await requireProjectAccess(ctx, args.projectId)
		if (!access.ok) return { error: access.error }
		const db = createTrackerDb(ctx.prisma, args.projectId)
		const story = await db.getStoryById(args.storyId)
		if (!story) return { error: `Story ${args.storyId} not found in project ${args.projectId}.` }
		const comment = await db.addComment(args.storyId, args.content)
		return {
			ok: {
				id: comment.id,
				storyId: args.storyId,
				content: comment.content,
				createdAt: comment.createdAt.toISOString(),
				url: storyUrl(ctx, args.projectId, story.number),
			},
		}
	},
})
