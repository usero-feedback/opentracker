import { defineConfig, devices } from '@playwright/test'

// Dedicated e2e port so the suite never collides with a dev server another session is running.
const PORT = process.env.E2E_PORT ?? '5188'
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
	testDir: './e2e',
	globalSetup: './e2e/global-setup.ts',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: 0,
	// Every worker shares one local D1; the wrangler dev proxy serialises writes badly under contention.
	workers: 1,
	reporter: process.env.CI ? 'html' : 'list',
	use: {
		baseURL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
	},
	timeout: 30000,
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	// Skip auto-starting a server when the caller pinned a base URL.
	webServer: process.env.PLAYWRIGHT_BASE_URL
		? undefined
		: {
				command: `PORT=${PORT} npm run dev`,
				url: baseURL,
				reuseExistingServer: !process.env.CI,
				timeout: 120000,
			},
})
