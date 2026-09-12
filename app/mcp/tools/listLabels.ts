import { createTrackerDb } from '~/utils/tracker-db.server'
import { projectIdArg, requireProjectAccess } from '../access'
import { defineTool } from '../types'

export const listLabels = defineTool({
	name: 'list_labels',
	description: 'The labels defined in a project, alphabetical, with colours. Label arguments elsewhere take these names exactly.',
	inputSchema: { projectId: projectIdArg },
	readOnly: true,
	handler: async (args, ctx) => {
		const access = await requireProjectAccess(ctx, args.projectId)
		if (!access.ok) return { error: access.error }
		const labels = await createTrackerDb(ctx.prisma, args.projectId).getAllLabels()
		return { ok: { labels, totalCount: labels.length } }
	},
})
