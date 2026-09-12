import { test, expect } from '@playwright/test'

test.describe('Example E2E Test', () => {
	test('should load the homepage', async ({ page }) => {
		await page.goto('/')

		// Basic check that the page loaded
		await expect(page).toHaveTitle(/opentracker/i)
	})

	test('should have working navigation', async ({ page }) => {
		await page.goto('/')

		// Add your specific navigation tests here
		// This is just a template to demonstrate the setup
	})
})
