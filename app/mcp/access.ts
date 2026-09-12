import { z } from 'zod'
import type { Label, Story, StoryState, StoryType } from '~/utils/tracker-db.server'
import type { McpContext } from './types'

export const STORY_TYPES = ['feature', 'bug', 'chore', 'release'] as const satisfies readonly StoryType[]
export const STORY_STATES = [
	'unscheduled',
	'unstarted',
	'started',
	'finished',
	'delivered',
	'accepted',
	'rejected',
] as const satisfies readonly StoryState[]

export const projectIdArg = z.string().min(1).describe('The project id. Get it from list_projects.')
export const storyIdArg = z.string().min(1).describe('The story id (not the number). Get it from list_stories.')
export const storyTypeArg = z.enum(STORY_TYPES)
export const storyStateArg = z.enum(STORY_STATES)
/** The point values the UI offers. */
export const pointsArg = z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(8)])
export const labelNamesArg = z.array(z.string().trim().min(1)).max(20).describe('Label names (exact, from list_labels).')

/** 404-shaped for both "missing" and "not yours", same as the REST routes, so ids cannot be enumerated. */
export async function requireProjectAccess(
	ctx: McpContext,
	projectId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const project = await ctx.prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } })
	if (!project || project.userId !== ctx.user.id) {
		return { ok: false, error: `Project ${projectId} not found for this API key. Call list_projects for the ids you can access.` }
	}
	return { ok: true }
}

export function storyUrl(ctx: McpContext, projectId: string, number: number): string {
	return `${ctx.dashboardUrl}/tracker/${projectId}?story=${number}`
}

/** Resolves label names to rows; an unknown name is an error, not a silent drop, so the agent never believes it was applied. */
export async function resolveLabels(
	ctx: McpContext,
	projectId: string,
	names: string[],
): Promise<{ ok: true; labels: Label[] } | { ok: false; error: string }> {
	const unique = [...new Set(names)]
	if (unique.length === 0) return { ok: true, labels: [] }
	const rows = await ctx.prisma.label.findMany({
		where: { projectId, name: { in: unique } },
		select: { id: true, name: true, color: true },
	})
	const found = new Set(rows.map(l => l.name))
	const missing = unique.filter(n => !found.has(n))
	if (missing.length > 0) {
		return { ok: false, error: `Unknown label(s): ${missing.join(', ')}. Call list_labels for the labels in this project.` }
	}
	return { ok: true, labels: rows }
}

export function serializeStory(ctx: McpContext, projectId: string, story: Story, includeComments: boolean) {
	return {
		id: story.id,
		number: story.number,
		title: story.title,
		description: story.description,
		type: story.type,
		state: story.state,
		points: story.points,
		priority: story.priority,
		iteration: story.iteration,
		deadline: story.deadline,
		labels: story.labels.map(l => l.name),
		commentCount: story.commentCount,
		...(includeComments
			? { comments: (story.comments ?? []).map(c => ({ id: c.id, content: c.content, createdAt: c.createdAt.toISOString() })) }
			: {}),
		createdAt: story.createdAt.toISOString(),
		updatedAt: story.updatedAt.toISOString(),
		url: storyUrl(ctx, projectId, story.number),
	}
}
