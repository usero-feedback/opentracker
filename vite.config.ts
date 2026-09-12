// import { cloudflare } from '@cloudflare/vite-plugin'
import { reactRouter } from '@react-router/dev/vite'
import { cloudflareDevProxy } from '@react-router/dev/vite/cloudflare'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ isSsrBuild }) => ({
	build: {
		rollupOptions: isSsrBuild
			? {
					input: './workers/app.ts',
					external: [
						'cloudflare:workers',
						'cloudflare:sockets',
						/^cloudflare:.*/, // Pattern to match all cloudflare runtime modules
					],
				}
			: undefined,
	},
	plugins: [
		cloudflareDevProxy({
			getLoadContext({ context }) {
				return { cloudflare: context.cloudflare }
			},
		}),
		// cloudflare({ viteEnvironment: { name: 'ssr' } }),
		tailwindcss(),
		reactRouter(),
		tsconfigPaths(),
		visualizer({
			// open: true, // Automatically open the report in your browser after build
			filename: 'bundle-analysis.html', // Output file name
			gzipSize: true, // Show GZIP size
			brotliSize: true, // Show Brotli size
		}),
	],
	server: {
		allowedHosts: ['.ngrok-free.app'],
		port: 5151,
	},
	// ssr: {
	// 	noExternal: ['react-feedback-collector'],
	// },
}))
