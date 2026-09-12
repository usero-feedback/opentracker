import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { checkToolCallRateLimit, MCP_TOOL_CALLS_PER_MINUTE } from './rateLimit'
import { addComment } from './tools/addComment'
import { createStory } from './tools/createStory'
import { getStory } from './tools/getStory'
import { listLabels } from './tools/listLabels'
import { listProjects } from './tools/listProjects'
import { listStories } from './tools/listStories'
import { updateStory } from './tools/updateStory'
import type { McpContext, McpToolDefinition, McpToolResult } from './types'

export const MCP_SERVER_NAME = 'tracker'
/** Bump on every tool change and add a changelog row to docs/mcp.md. */
export const MCP_SERVER_VERSION = '1.0.0'

/** Sent in the initialize result; Claude Code shows the model only tool names until it loads one, so this routes the workflow. */
export const MCP_SERVER_INSTRUCTIONS = `Tracker is a lightweight story board (icebox, backlog, current iteration, done). Auth is an API key from https://tracker.usero.io/profile sent as "Authorization: Bearer lt_...". If a call returns 401, ask the user for a key; there is no signup flow here.

Workflow: list_projects for the projectId, then list_stories (filter by state, type, label or search) to read the board and get_story for one story with its comments. When you begin work on a story call update_story with state "started"; when the work is done, state "finished" (delivered/accepted/rejected are the review steps a human usually takes). create_story files a new story into the icebox; add_comment leaves progress notes or PR links on a story; list_labels gives the exact label names update_story and create_story accept. Story ids are the "id" field, not the number. Never invent counts or states; read first, then write.`

/** One file per tool under ./tools. Adding one without a row in docs/mcp.md fails registry.test.ts. */
export const MCP_TOOLS: readonly McpToolDefinition[] = [
	listProjects,
	listStories,
	getStory,
	createStory,
	updateStory,
	addComment,
	listLabels,
]

function toContent(result: McpToolResult) {
	if ('error' in result) return { content: [{ type: 'text' as const, text: result.error }], isError: true }
	return { content: [{ type: 'text' as const, text: JSON.stringify(result.ok, null, 2) }] }
}

async function runTool(tool: McpToolDefinition, args: Record<string, unknown>, ctx: McpContext): Promise<McpToolResult> {
	const limit = checkToolCallRateLimit(ctx.user.id)
	if (!limit.allowed) {
		return {
			error: `Rate limit: more than ${MCP_TOOL_CALLS_PER_MINUTE} tool calls in the last minute. Retry in ${limit.retryAfterSeconds}s.`,
		}
	}
	try {
		return await tool.handler(args, ctx)
	} catch (error) {
		// Expected failures come back as { error }; anything here is a bug or outage.
		console.error(`[mcp] ${tool.name} threw`, error)
		return { error: `${tool.name} failed unexpectedly. Try again; if it keeps failing, report the time of the call.` }
	}
}

/** A fresh server per request: a handful of Map writes, and the server holds no state. */
export function buildMcpServer(ctx: McpContext): McpServer {
	const server = new McpServer({ name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION }, { instructions: MCP_SERVER_INSTRUCTIONS })
	for (const tool of MCP_TOOLS) {
		server.registerTool(
			tool.name,
			{
				description: tool.description,
				// Strict: an unknown argument is an error the model can read, not a silent no-op.
				inputSchema: z.object(tool.inputSchema).strict(),
				annotations: { readOnlyHint: tool.readOnly, destructiveHint: false, openWorldHint: false },
			},
			async args => toContent(await runTool(tool, args, ctx)),
		)
	}
	return server
}
