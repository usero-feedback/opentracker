import { test, expect } from '@playwright/test'
import { fillAuthForm, generateTestEmail, TEST_USER_PASSWORD, useFreshClientIp, waitForHydration } from '../utils/fixtures'

test.describe.serial('Authentication', () => {
	const email = generateTestEmail()
	const password = TEST_USER_PASSWORD

	test.beforeEach(async ({ page }) => {
		await useFreshClientIp(page)
	})

	test('signup lands in the tracker', async ({ page }) => {
		await page.goto('/signup')
		await waitForHydration(page)
		await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible()
		await fillAuthForm(page, email, password)
		await page.getByRole('button', { name: 'Create Account' }).click()
		await expect(page).toHaveURL(/\/tracker/, { timeout: 15000 })
	})

	test('login with correct credentials lands in the tracker', async ({ page }) => {
		await page.goto('/login')
		await waitForHydration(page)
		await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
		await fillAuthForm(page, email, password)
		await page.getByRole('button', { name: 'Log In' }).click()
		await expect(page).toHaveURL(/\/tracker/, { timeout: 15000 })
	})

	test('wrong password shows an error and stays on login', async ({ page }) => {
		await page.goto('/login')
		await waitForHydration(page)
		await fillAuthForm(page, email, 'WrongPassword123!')
		await page.getByRole('button', { name: 'Log In' }).click()
		await expect(page.getByText('Invalid email or password', { exact: true })).toBeVisible({ timeout: 10000 })
		await expect(page).toHaveURL(/\/login/)
	})

	test('unknown email shows an error and stays on login', async ({ page }) => {
		await page.goto('/login')
		await waitForHydration(page)
		await fillAuthForm(page, generateTestEmail(), 'SomePassword123!')
		await page.getByRole('button', { name: 'Log In' }).click()
		await expect(page.getByText('Invalid email or password', { exact: true })).toBeVisible({ timeout: 10000 })
		await expect(page).toHaveURL(/\/login/)
	})

	test('/tracker without a session redirects to signup', async ({ page }) => {
		await page.goto('/tracker')
		await expect(page).toHaveURL(/\/signup/)
	})
})
