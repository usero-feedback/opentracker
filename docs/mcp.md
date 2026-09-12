# Tracker MCP server

Tracker runs a remote [Model Context Protocol](https://modelcontextprotocol.io) server at `https://tracker.usero.io/mcp`. Point
Claude Code (or any MCP client that speaks streamable HTTP) at it and the agent can read the board, file stories, mark them
started and finished, and leave comments, without leaving the editor.

## Setup

1. Sign in to [tracker.usero.io/profile](https://tracker.usero.io/profile) and create an API key (`lt_...`), named for the machine
   or agent using it. It is shown once. You can hold several keys and revoke one without touching the others.
2. Register the server:

```bash
claude mcp add --transport http tracker https://tracker.usero.io/mcp --header "Authorization: Bearer <key>"
```

For a user-level entry that keeps the key out of the config file, put the key in an env var and reference it:

```json
{
	"mcpServers": {
		"tracker": {
			"type": "http",
			"url": "https://tracker.usero.io/mcp",
			"headers": { "Authorization": "Bearer ${TRACKER_API_KEY}" }
		}
	}
}
```

Auth is bearer API key only. There is no OAuth flow and no signup tool; a missing or wrong key gets a JSON-RPC 401 pointing at the
profile page. The key acts as you: the agent sees every project you own.

## Transport

Stateless streamable HTTP with JSON responses. `POST /mcp` with JSON-RPC 2.0. `GET /mcp` returns a short JSON description, or 405
when the client asks for `text/event-stream` (there is no server push). No sessions, no resumption.

## Tools

| Tool            | Read-only | What it does                                                                                                                                     |
| --------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `list_projects` | yes       | Projects the key can access, with story counts per state and the board URL. Call first for a projectId.                                          |
| `list_stories`  | yes       | Stories in board order. Filters: state, type, label name, text search, limit/offset. Accepted excluded by default.                               |
| `get_story`     | yes       | One story with labels and every comment.                                                                                                         |
| `create_story`  | no        | New story into the icebox (unscheduled). Title, description, type, points (1/2/4/8), labels, deadline.                                           |
| `update_story`  | no        | Patch title, description, type, points, labels (full set) and state. State changes use the board's transition logic, so position matches the UI. |
| `add_comment`   | no        | Add a markdown comment to a story.                                                                                                               |
| `list_labels`   | yes       | The project's labels; label arguments elsewhere take these names exactly.                                                                        |

Rate limit: 120 tool calls per minute per key, per Worker isolate.

## Local smoke test

```bash
curl -s http://localhost:5173/mcp -H "Authorization: Bearer lt_..." -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
```

Code lives in `app/mcp/` (registry, types, one file per tool under `tools/`) and `app/routes/mcp.tsx`. `app/mcp/registry.test.ts`
fails if a tool is registered without a row in the table above, or documented without being registered.

## Changelog

| Version | Change                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------ |
| v1.0.0  | First release: list_projects, list_stories, get_story, create_story, update_story, add_comment, list_labels. |
