import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import type { ActionFunctionArgs, AppLoadContext, LoaderFunctionArgs } from 'react-router'
import { buildMcpServer, MCP_SERVER_NAME, MCP_SERVER_VERSION, MCP_TOOLS } from '~/mcp/registry'
import type { McpContext } from '~/mcp/types'
import { getApiUser } from '~/utils/api-auth.server'
import { contextToBackendConfig } from '~/utils/backendConfig'
import { getPrisma } from '~/utils/db.server'

// Tracker MCP server at /mcp: streamable HTTP, stateless, JSON responses, bearer API key only.

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function dashboardUrl(context: AppLoadContext): string {
	return contextToBackendConfig(context).dashboardUrl
}

function unauthorizedMessage(context: AppLoadContext): string {
	return `Unauthorized. Send "Authorization: Bearer lt_..." with an API key from ${dashboardUrl(context)}/profile (sign in, then API Keys).`
}

function jsonRpcError(status: number, code: number, message: string, extraHeaders: Record<string, string> = {}): Response {
	return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null }), {
		status,
		headers: { ...JSON_HEADERS, ...extraHeaders },
	})
}

// GET with Accept: text/event-stream is a client opening a push stream; there is none, so 405 (a 200 body reads as a dead stream).
export async function loader({ request, context }: LoaderFunctionArgs) {
	if ((request.headers.get('Accept') ?? '').includes('text/event-stream')) {
		return jsonRpcError(405, -32000, 'This server does not open server-push streams. POST JSON-RPC 2.0 to this URL.', {
			Allow: 'GET, POST, DELETE',
		})
	}
	return new Response(
		JSON.stringify(
			{
				name: MCP_SERVER_NAME,
				version: MCP_SERVER_VERSION,
				protocol: 'Model Context Protocol, streamable HTTP (POST JSON-RPC 2.0 to this URL)',
				auth: `Authorization: Bearer lt_... (an API key from ${dashboardUrl(context)}/profile)`,
				tools: MCP_TOOLS.map(t => t.name),
			},
			null,
			2,
		),
		{ headers: { ...JSON_HEADERS, 'Cache-Control': 'public, max-age=300', Vary: 'Accept' } },
	)
}

export async function action({ request, context }: ActionFunctionArgs) {
	if (request.method !== 'POST' && request.method !== 'DELETE') {
		return jsonRpcError(405, -32000, 'Method not allowed. POST JSON-RPC 2.0 to this URL.', { Allow: 'GET, POST, DELETE' })
	}
	const user = await getApiUser(request, context)
	if (!user) {
		return jsonRpcError(401, -32001, unauthorizedMessage(context), {
			'WWW-Authenticate': 'Bearer realm="tracker"',
		})
	}

	const ctx: McpContext = {
		context,
		prisma: getPrisma({ context }),
		request,
		user,
		dashboardUrl: dashboardUrl(context),
	}
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined, // stateless
		enableJsonResponse: true, // one-shot tools, no SSE keep-alive to babysit
	})
	const server = buildMcpServer(ctx)
	await server.connect(transport)
	const response = await transport.handleRequest(request)
	if (response.status >= 400 && response.status < 500) {
		console.warn(`[mcp] transport rejected request: ${response.status} ${(await response.clone().text()).slice(0, 200)}`)
	}
	return response
}
