import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import type { StoryState, StoryType } from '~/utils/tracker-db.server'
import { projectIdArg, requireProjectAccess, serializeStory, storyStateArg, storyTypeArg } from '../access'
import { defineTool } from '../types'

export const LIST_STORIES_DEFAULT_LIMIT = 50
export const LIST_STORIES_MAX_LIMIT = 200

export const listStories = defineTool({
	name: 'list_stories',
	description: `List stories in a project in board order (iteration, then position), without comments. Filter by state, type, label name or text; accepted stories are excluded unless you ask for state "accepted". Pages of ${LIST_STORIES_DEFAULT_LIMIT} (max ${LIST_STORIES_MAX_LIMIT}); when hasMore is true call again with offset = nextOffset. Use get_story for one story with its comments.`,
	inputSchema: {
		projectId: projectIdArg,
		state: storyStateArg.optional().describe('Only stories in this state.'),
		type: storyTypeArg.optional().describe('Only stories of this type.'),
		label: z.string().trim().min(1).optional().describe('Only stories carrying this label name (exact).'),
		search: z.string().trim().min(1).max(200).optional().describe('Case-insensitive substring match on title or description.'),
		limit: z.number().int().min(1).max(LIST_STORIES_MAX_LIMIT).default(LIST_STORIES_DEFAULT_LIMIT),
		offset: z.number().int().min(0).default(0).describe('Stories to skip; pass nextOffset from the previous page.'),
	},
	readOnly: true,
	handler: async (args, ctx) => {
		const access = await requireProjectAccess(ctx, args.projectId)
		if (!access.ok) return { error: access.error }

		// `contains` is LIKE on SQLite: case-insensitive for ASCII already.
		const where: Prisma.StoryWhereInput = { projectId: args.projectId }
		where.state = args.state ?? { not: 'accepted' }
		if (args.type) where.type = args.type
		if (args.label) where.labels = { some: { label: { name: args.label } } }
		if (args.search) where.OR = [{ title: { contains: args.search } }, { description: { contains: args.search } }]

		const [rows, totalCount] = await Promise.all([
			ctx.prisma.story.findMany({
				where,
				include: { labels: { include: { label: true } }, _count: { select: { comments: true } } },
				orderBy: [{ iteration: 'asc' }, { position: 'asc' }],
				skip: args.offset,
				take: args.limit,
			}),
			ctx.prisma.story.count({ where }),
		])

		const nextOffset = args.offset + rows.length
		const hasMore = nextOffset < totalCount
		return {
			ok: {
				stories: rows.map(r =>
					serializeStory(
						ctx,
						args.projectId,
						{
							...r,
							type: r.type as StoryType,
							state: r.state as StoryState,
							labels: r.labels.map(sl => sl.label),
							commentCount: r._count.comments,
						},
						false,
					),
				),
				totalCount,
				returned: rows.length,
				offset: args.offset,
				hasMore,
				nextOffset: hasMore ? nextOffset : null,
			},
		}
	},
})
