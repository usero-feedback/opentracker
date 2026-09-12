import type { PrismaClient } from '@prisma/client'
import type { AppLoadContext } from 'react-router'
import type { z } from 'zod'
import type { ApiUser } from '~/utils/api-auth.server'

/** Built once per request in app/routes/mcp.tsx after the API key resolves. */
export interface McpContext {
	context: AppLoadContext
	prisma: PrismaClient
	request: Request
	user: ApiUser
	/** DASHBOARD_URL, for absolute story links. */
	dashboardUrl: string
}

/** `ok` becomes a JSON text block; `error` becomes isError so the agent sees a readable failure. */
export type McpToolResult = { ok: unknown } | { error: string }

/** One tool per file under app/mcp/tools, registered in registry.ts. */
export interface McpToolDefinition<Shape extends z.ZodRawShape = z.ZodRawShape> {
	name: string
	description: string
	inputSchema: Shape
	readOnly: boolean
	// Method syntax keeps parameter bivariance so mixed shapes fit one array.
	handler(args: z.infer<z.ZodObject<Shape>>, ctx: McpContext): Promise<McpToolResult>
}

export function defineTool<Shape extends z.ZodRawShape>(tool: McpToolDefinition<Shape>): McpToolDefinition<Shape> {
	return tool
}
