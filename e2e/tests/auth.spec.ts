import { test, expect } from '@playwright/test'

test.describe.serial('Authentication Flow', () => {
	const testEmail = `e2e-${Date.now()}@test.leantracker.app`
	const testPassword = 'TestPassword123!'

	test('should complete full signup flow', async ({ page }) => {
		await page.goto('/signup')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000) // Wait for React hydration

		const emailInput = page.getByPlaceholder('Email')
		await emailInput.click()
		await emailInput.type(testEmail)

		const passwordInput = page.getByPlaceholder('Password')
		await passwordInput.click()
		await passwordInput.type(testPassword)

		await page.getByRole('button', { name: 'Create Account' }).click()
		await expect(page).toHaveURL(/\/tracker/, { timeout: 15000 })
	})

	test('should login with correct credentials', async ({ page }) => {
		await page.goto('/login')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)

		const emailInput = page.getByPlaceholder('Email')
		await emailInput.click()
		await emailInput.type(testEmail)

		const passwordInput = page.getByPlaceholder('Password')
		await passwordInput.click()
		await passwordInput.type(testPassword)

		await page.getByRole('button', { name: 'Log In' }).click()
		await expect(page).toHaveURL(/\/tracker/, { timeout: 15000 })
	})

	test('should show error with wrong password', async ({ page }) => {
		await page.goto('/login')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)

		const emailInput = page.getByPlaceholder('Email')
		await emailInput.click()
		await emailInput.type(testEmail)

		const passwordInput = page.getByPlaceholder('Password')
		await passwordInput.click()
		await passwordInput.type('WrongPassword123!')

		await page.getByRole('button', { name: 'Log In' }).click()
		await page.waitForTimeout(2000)
		expect(page.url()).toContain('/login')
	})

	test('should show error for non-existent user', async ({ page }) => {
		await page.goto('/login')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)

		const emailInput = page.getByPlaceholder('Email')
		await emailInput.click()
		await emailInput.type(`nonexistent-${Date.now()}@test.leantracker.app`)

		const passwordInput = page.getByPlaceholder('Password')
		await passwordInput.click()
		await passwordInput.type('SomePassword123!')

		await page.getByRole('button', { name: 'Log In' }).click()
		await page.waitForTimeout(2000)
		expect(page.url()).toContain('/login')
	})
})
