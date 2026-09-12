import { chromium } from '@playwright/test'
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from './utils/fixtures'

/**
 * Global setup - creates test account if it doesn't exist
 */
async function globalSetup() {
	const browser = await chromium.launch()
	const page = await browser.newPage()

	try {
		// Try to login first
		await page.goto('http://localhost:5155/login')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)

		const emailInput = page.getByPlaceholder('Email')
		await emailInput.click()
		await emailInput.type(TEST_USER_EMAIL)

		const passwordInput = page.getByPlaceholder('Password')
		await passwordInput.click()
		await passwordInput.type(TEST_USER_PASSWORD)

		await page.getByRole('button', { name: 'Log In' }).click()

		// Wait to see if login succeeds
		try {
			await page.waitForURL(/\/tracker/, { timeout: 5000 })
			console.log('Test account already exists, login successful')
		} catch {
			// Login failed, need to create account
			console.log('Test account does not exist, creating...')

			await page.goto('http://localhost:5155/signup')
			await page.waitForLoadState('networkidle')
			await page.waitForTimeout(2000)

			const signupEmail = page.getByPlaceholder('Email')
			await signupEmail.click()
			await signupEmail.type(TEST_USER_EMAIL)

			const signupPassword = page.getByPlaceholder('Password')
			await signupPassword.click()
			await signupPassword.type(TEST_USER_PASSWORD)

			await page.getByRole('button', { name: 'Create Account' }).click()
			await page.waitForURL(/\/tracker/, { timeout: 15000 })

			console.log('Test account created successfully')
		}
	} catch (error) {
		console.error('Global setup failed:', error)
		throw error
	} finally {
		await browser.close()
	}
}

export default globalSetup
