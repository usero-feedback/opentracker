# opentracker

Pivotal Tracker style story board with an MCP server for coding agents. React Router 7 (framework mode, file based routes in
`app/routes`) on Cloudflare Workers with D1 via Prisma. See README.md for setup, deploy and migrations.

# Commands

- `npm run dev`: local dev server at http://localhost:5173
- `npm run typecheck`: regenerates worker + route types, then `tsc -b`. Run after any large change.
- `npm test`: vitest over `app/`
- `npm run test:e2e`: Playwright, login fixtures in `e2e/utils/fixtures.ts`

# Code style

- Strict typing. Never `any`; use `unknown` and narrow.
- Short comments only, and only where the code does not explain itself.

# Routes and data

- Prefer loaders and actions in page routes over separate API routes. `api.*` routes exist for the REST API only; the MCP server
  lives in `app/mcp` and is served from `app/routes/mcp.tsx`.
- Submit structured data with `jsonToFormData()` from `~/utils/deserialise` and parse it in the action with
  `deserialise(request, Schema)`. Use a discriminated union with a `type` field when one action handles several cases;
  `app/routes/_.profile.tsx` is the reference.
- Never manually build `FormData` unless uploading files.

# Database

- Schema is `prisma/schema.prisma`. Any change needs a migration; the steps are in README.md under Migrations. The generated SQL
  file is untracked until you `git add` it, so check `git status migrations/` before committing.
- No raw SQL; use the Prisma query builder.
