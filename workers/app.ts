import { createRequestHandler } from 'react-router'

declare module 'react-router' {
	export interface AppLoadContext {
		cloudflare: {
			env: Env
			ctx: ExecutionContext
		}
	}
}

const requestHandler = createRequestHandler(() => import('virtual:react-router/server-build'), import.meta.env.MODE)

export default {
	async fetch(request, env, ctx) {
		return requestHandler(request, {
			cloudflare: { env, ctx },
		})
	},

	async scheduled(controller, env, ctx) {
		// Scheduled jobs placeholder - add tracker-specific jobs here if needed
		console.log(`Scheduled job triggered: ${controller.cron}`)
	},
} satisfies ExportedHandler<Env>
