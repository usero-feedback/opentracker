import { defineTool } from '../types'

export const listProjects = defineTool({
	name: 'list_projects',
	description:
		'List the tracker projects this API key can access, newest first, with story counts per state and the board URL. Call this first to get a projectId for the other tools.',
	inputSchema: {},
	readOnly: true,
	handler: async (_args, ctx) => {
		const projects = await ctx.prisma.project.findMany({
			where: { userId: ctx.user.id },
			select: { id: true, name: true, velocity: true, iterationLength: true, createdAt: true },
			orderBy: { createdAt: 'desc' },
		})
		const ids = projects.map(p => p.id)
		const counts =
			ids.length > 0
				? await ctx.prisma.story.groupBy({ by: ['projectId', 'state'], where: { projectId: { in: ids } }, _count: { id: true } })
				: []
		const byProject = new Map<string, Record<string, number>>()
		for (const row of counts) {
			const entry = byProject.get(row.projectId) ?? {}
			entry[row.state] = row._count.id
			byProject.set(row.projectId, entry)
		}
		return {
			ok: {
				projects: projects.map(p => ({
					id: p.id,
					name: p.name,
					velocity: p.velocity,
					iterationLengthDays: p.iterationLength,
					storiesByState: byProject.get(p.id) ?? {},
					createdAt: p.createdAt.toISOString(),
					url: `${ctx.dashboardUrl}/tracker/${p.id}`,
				})),
				totalCount: projects.length,
			},
		}
	},
})
