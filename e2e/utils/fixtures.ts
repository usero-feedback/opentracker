import { Page } from '@playwright/test'

/**
 * Test fixtures for E2E tests
 *
 * Pre-created test account for parallel test execution.
 * This account should be seeded in the database.
 */

// Fixed test account - must exist in the database
export const TEST_USER_EMAIL = 'e2e-test@test.leantracker.app'
export const TEST_USER_PASSWORD = 'TestPassword123!'

/**
 * Login helper - logs in with the test account
 */
export async function login(page: Page) {
	await page.goto('/login')
	await page.waitForLoadState('networkidle')
	await page.waitForTimeout(2000) // Wait for React hydration

	const emailInput = page.getByPlaceholder('Email')
	await emailInput.click()
	await emailInput.type(TEST_USER_EMAIL)

	const passwordInput = page.getByPlaceholder('Password')
	await passwordInput.click()
	await passwordInput.type(TEST_USER_PASSWORD)

	await page.getByRole('button', { name: 'Log In' }).click()
	await page.waitForURL(/\/tracker/, { timeout: 15000 })
}

/**
 * Signup helper - creates a new account (only for auth tests)
 */
export async function signup(page: Page, email: string, password: string) {
	await page.goto('/signup')
	await page.waitForLoadState('networkidle')
	await page.waitForTimeout(2000) // Wait for React hydration

	const emailInput = page.getByPlaceholder('Email')
	await emailInput.click()
	await emailInput.type(email)

	const passwordInput = page.getByPlaceholder('Password')
	await passwordInput.click()
	await passwordInput.type(password)

	await page.getByRole('button', { name: 'Create Account' }).click()
	await page.waitForURL(/\/tracker/, { timeout: 15000 })
}
