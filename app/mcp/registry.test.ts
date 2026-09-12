import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import docs from '../../docs/mcp.md?raw'
import { checkToolCallRateLimit, MCP_TOOL_CALLS_PER_MINUTE, resetToolCallRateLimit } from './rateLimit'
import { MCP_SERVER_INSTRUCTIONS, MCP_SERVER_VERSION, MCP_TOOLS } from './registry'

// Drift guard: docs/mcp.md must name every registered tool and no others.

function documentedToolNames(): string[] {
	const toolsSection = docs.split('## Tools')[1]?.split('\n## ')[0] ?? ''
	return [...toolsSection.matchAll(/^\| `([a-z_]+)`\s+\|/gm)].map(m => m[1])
}

function schema(name: string) {
	const tool = MCP_TOOLS.find(t => t.name === name)
	if (!tool) throw new Error(`no tool ${name}`)
	return z.object(tool.inputSchema).strict()
}

describe('MCP registry <-> docs drift', () => {
	const registered = MCP_TOOLS.map(t => t.name)
	const documented = documentedToolNames()

	it('every registered tool has a row in the docs tool table', () => {
		for (const name of registered) expect(documented, `docs/mcp.md is missing a row for "${name}"`).toContain(name)
	})

	it('every documented tool is registered', () => {
		for (const name of documented) expect(registered, `docs/mcp.md documents "${name}" but registry.ts does not`).toContain(name)
	})

	it('the docs changelog mentions the current server version', () => {
		expect(docs).toContain(`v${MCP_SERVER_VERSION}`)
	})

	it('docs and instructions contain no em dashes', () => {
		expect(docs.includes('—')).toBe(false)
		expect(MCP_SERVER_INSTRUCTIONS.includes('—')).toBe(false)
	})
})

describe('MCP tool definitions', () => {
	it('tool names are unique and snake_case', () => {
		const names = MCP_TOOLS.map(t => t.name)
		expect(new Set(names).size).toBe(names.length)
		for (const name of names) expect(name).toMatch(/^[a-z][a-z0-9_]*$/)
	})

	it('every tool has a description and a readOnly flag', () => {
		for (const tool of MCP_TOOLS) {
			expect(tool.description.length).toBeGreaterThan(20)
			expect(typeof tool.readOnly).toBe('boolean')
		}
	})

	it('write tools are the only ones not marked read-only', () => {
		expect(
			MCP_TOOLS.filter(t => !t.readOnly)
				.map(t => t.name)
				.sort(),
		).toEqual(['add_comment', 'create_story', 'update_story'])
	})

	it('instructions name every tool', () => {
		for (const tool of MCP_TOOLS) expect(MCP_SERVER_INSTRUCTIONS).toContain(tool.name)
	})

	it('strict schemas reject unknown arguments instead of ignoring them', () => {
		expect(schema('list_stories').safeParse({ projectId: 'p', status: 'started' }).success).toBe(false)
		expect(schema('list_stories').safeParse({ projectId: 'p', state: 'started' }).success).toBe(true)
		expect(schema('list_projects').safeParse({ limit: 5 }).success).toBe(false)
		expect(schema('list_projects').safeParse({}).success).toBe(true)
	})

	it('list_stories validates filters and applies defaults', () => {
		expect(schema('list_stories').safeParse({}).success).toBe(false)
		expect(schema('list_stories').safeParse({ projectId: 'p', state: 'done' }).success).toBe(false)
		expect(schema('list_stories').safeParse({ projectId: 'p', type: 'epic' }).success).toBe(false)
		expect(schema('list_stories').safeParse({ projectId: 'p', limit: 500 }).success).toBe(false)
		expect(schema('list_stories').parse({ projectId: 'p' })).toMatchObject({ projectId: 'p', limit: 50, offset: 0 })
	})

	it('create_story needs a title and takes the UI point values only', () => {
		expect(schema('create_story').safeParse({ projectId: 'p' }).success).toBe(false)
		expect(schema('create_story').safeParse({ projectId: 'p', title: 'Fix login' }).success).toBe(true)
		expect(schema('create_story').safeParse({ projectId: 'p', title: 'Fix login', points: 3 }).success).toBe(false)
		expect(schema('create_story').safeParse({ projectId: 'p', title: 'Fix login', points: 4, labels: ['backend'] }).success).toBe(
			true,
		)
		expect(
			schema('create_story').safeParse({ projectId: 'p', title: 'Ship', type: 'release', deadline: '2026-10-01' }).success,
		).toBe(true)
		expect(
			schema('create_story').safeParse({ projectId: 'p', title: 'Ship', type: 'release', deadline: 'next week' }).success,
		).toBe(false)
		expect(schema('create_story').parse({ projectId: 'p', title: 'x' })).toMatchObject({
			type: 'feature',
			description: '',
			labels: [],
		})
	})

	it('update_story takes a partial patch with the schema state enum', () => {
		expect(schema('update_story').safeParse({ projectId: 'p', storyId: 's' }).success).toBe(true) // handler refuses: nothing to update
		expect(schema('update_story').safeParse({ projectId: 'p', storyId: 's', state: 'finished' }).success).toBe(true)
		expect(schema('update_story').safeParse({ projectId: 'p', storyId: 's', state: 'done' }).success).toBe(false)
		expect(schema('update_story').safeParse({ projectId: 'p', storyId: 's', points: null }).success).toBe(true)
		expect(schema('update_story').safeParse({ projectId: 'p', storyId: 's', labels: [] }).success).toBe(true)
		expect(schema('update_story').safeParse({ projectId: 'p', storyId: 's', iteration: 2 }).success).toBe(false)
		expect(schema('update_story').safeParse({ storyId: 's', state: 'started' }).success).toBe(false)
	})

	it('get_story, add_comment and list_labels take the ids they need', () => {
		expect(schema('get_story').safeParse({ projectId: 'p', storyId: 's' }).success).toBe(true)
		expect(schema('get_story').safeParse({ projectId: 'p' }).success).toBe(false)
		expect(schema('add_comment').safeParse({ projectId: 'p', storyId: 's', content: '' }).success).toBe(false)
		expect(schema('add_comment').safeParse({ projectId: 'p', storyId: 's', content: 'Shipped in abc123' }).success).toBe(true)
		expect(schema('list_labels').safeParse({ projectId: 'p' }).success).toBe(true)
		expect(schema('list_labels').safeParse({}).success).toBe(false)
	})
})

describe('rate limit', () => {
	it('allows the limit, then blocks with a retry hint, per key', () => {
		resetToolCallRateLimit()
		const now = 1_000_000
		for (let i = 0; i < MCP_TOOL_CALLS_PER_MINUTE; i++) expect(checkToolCallRateLimit('key-a', now + i).allowed).toBe(true)
		const blocked = checkToolCallRateLimit('key-a', now + 500)
		expect(blocked.allowed).toBe(false)
		if (!blocked.allowed) expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
		expect(checkToolCallRateLimit('key-b', now + 500).allowed).toBe(true)
		expect(checkToolCallRateLimit('key-a', now + 61_000).allowed).toBe(true)
	})
})
