# opentracker

Open source Pivotal Tracker.

Broadcom shut Pivotal Tracker down in April 2025. This is the same board: icebox, backlog, current iteration, done. Stories are 1,
2, 4 or 8 points, iterations fill to your velocity, and a story goes started, finished, delivered, then accepted or rejected.

Runs on Cloudflare Workers with a D1 database, free tier is enough. Hosted version at
[tracker.usero.io](https://tracker.usero.io).

It also has an MCP server.

## Connect an agent (optional)

Sign in, open `/profile`, create an API key (`lt_...`, shown once, one per machine or agent), then:

```sh
claude mcp add --transport http tracker https://your-tracker.example.com/mcp --header "Authorization: Bearer lt_..."
```

Any MCP client that speaks streamable HTTP works the same way (Cursor, OpenCode). The tools are `list_projects`, `list_stories`,
`get_story`, `create_story`, `update_story`, `add_comment` and `list_labels`. `update_story` handles the state changes: `started`
when the agent begins, `finished` when the work is done, and the agent leaves its notes and PR links with `add_comment`.
Delivered, accepted and rejected are the review steps a human usually takes on the board. Details, transport and the env var
config in [docs/mcp.md](docs/mcp.md).

A REST API is also available, see `API.md`.

## Run it locally

```sh
npm ci
cp .dev.vars.example .dev.vars   # set SESSION_SECRET; everything else is optional
npx wrangler d1 migrations apply leantracker --local
npm run dev
```

The dev server is at http://localhost:5173. Sign up there, create a project and an API key, and point the `claude mcp add` line
above at `http://localhost:5173/mcp`.

`npm run dev:tunnel` is the same server behind a named cloudflared tunnel (used for the hosted dev instance).

## Deploy to your own Cloudflare

```sh
npx wrangler d1 create leantracker
# paste the database_id into wrangler.jsonc (d1_databases) and set routes to your domain, or delete routes to use workers.dev
npx wrangler d1 migrations apply leantracker --remote
npx wrangler secret put SESSION_SECRET
npm run deploy
```

Optional secrets (`wrangler secret put`): `SES_AWS_ACCESS_KEY_ID` and `SES_AWS_SECRET_ACCESS_KEY` for email, `SENTRY_DSN`,
`GOOGLE_ANALYTICS_API_SECRET`. Optional vars in `wrangler.jsonc`: `DASHBOARD_URL`, `GOOGLE_ANALYTICS_ID`, `EMAIL_FROM`,
`ADMIN_EMAIL`, `USERO_CLIENT_ID` (set to `""` to hide the feedback widget).

Email is only used for admin notifications (new signups and the like, sent to `ADMIN_EMAIL`). Leave the SES keys unset and it logs
instead of sending.

## Migrations

Edit `prisma/schema.prisma`, then:

```sh
npx wrangler d1 migrations create leantracker <name>
npx prisma migrate diff --from-local-d1 --to-schema-datamodel ./prisma/schema.prisma --script --output migrations/<NNNN_name>.sql
npx wrangler d1 migrations apply leantracker --local
npx prisma generate
```

The CI workflow applies migrations to the remote database on push to `main`. By hand:

```sh
npx wrangler d1 migrations apply leantracker --remote
```

`npm run cf-typegen` regenerates the binding types after changing `wrangler.jsonc`.

## Status

Early. One person uses it daily, so the paths I hit are solid and the ones I don't are less so. Expect rough edges around
multi-user projects and anything I have not needed yet. Issues and PRs welcome, small ones especially.

## Built by Usero

opentracker is built by [Usero](https://usero.io), the user feedback tool. The feedback widget in the corner of the hosted version
is ours. Set `USERO_CLIENT_ID=""` to hide it in your own deployment.

## License

MIT, see `LICENSE`.
