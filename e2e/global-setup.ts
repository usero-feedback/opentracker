import { chromium, type FullConfig } from '@playwright/test'
import { fillAuthForm, TEST_USER_EMAIL, TEST_USER_PASSWORD, useFreshClientIp, waitForHydration } from './utils/fixtures'

// Makes sure the shared test account exists: try to log in, sign up if that fails
async function globalSetup(config: FullConfig) {
	const baseURL = config.projects[0]?.use.baseURL
	if (!baseURL) throw new Error('baseURL is not set in playwright.config.ts')

	const browser = await chromium.launch()
	const page = await browser.newPage({ baseURL })
	try {
		await useFreshClientIp(page)
		await page.goto('/login')
		await waitForHydration(page)
		await fillAuthForm(page, TEST_USER_EMAIL, TEST_USER_PASSWORD)
		await page.getByRole('button', { name: 'Log In' }).click()
		try {
			await page.waitForURL(/\/tracker/, { timeout: 5000 })
			console.log('Test account exists')
		} catch {
			console.log('Test account missing, creating it')
			await page.goto('/signup')
			await waitForHydration(page)
			await fillAuthForm(page, TEST_USER_EMAIL, TEST_USER_PASSWORD)
			await page.getByRole('button', { name: 'Create Account' }).click()
			await page.waitForURL(/\/tracker/, { timeout: 15000 })
		}
	} finally {
		await browser.close()
	}
}

export default globalSetup
