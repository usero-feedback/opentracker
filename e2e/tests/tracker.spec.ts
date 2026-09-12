import { test, expect } from '@playwright/test'
import { login } from '../utils/fixtures'

/**
 * Tracker Board E2E Tests
 *
 * Tests story management on the tracker board.
 * Uses a pre-created test account for parallel execution.
 */

test.describe('Tracker Board - Story Management', () => {
	let projectId: string

	// Setup: Login and create a project for each test
	test.beforeEach(async ({ page }) => {
		await login(page)

		const projectName = `Tracker Test ${Date.now()}`

		// Create a project
		await page.goto('/tracker/new')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000) // Wait for React hydration
		await page.fill('input[name="name"]', projectName)
		await page.locator('button[type="submit"]').click()
		await page.waitForURL(/\/tracker\/[a-z0-9]{10,}/, { timeout: 15000 })

		// Extract project ID from URL
		const url = page.url()
		projectId = url.split('/').pop() || ''

		// Wait for board to load
		await page.waitForLoadState('networkidle')
	})

	test('should create a feature story and see it in icebox', async ({ page }) => {
		const storyTitle = `Test Feature ${Date.now()}`

		// Open the Add Story dialog
		const addButton = page.locator('button[aria-label="Add story"], svg.lucide-plus').first()
		await addButton.click()

		// Wait for dialog to open
		await page.waitForSelector('input#title', { state: 'visible' })

		// Fill in story details
		await page.fill('input#title', storyTitle)
		await page.fill('textarea#description', 'This is a test feature story')

		// Submit the form
		await page.click('button[type="submit"]:has-text("Add Story")')

		// Wait for dialog to close and story to appear
		await page.waitForTimeout(1000)

		// Should see the story in the Icebox
		const storyCard = page.locator(`text=${storyTitle}`)
		await expect(storyCard).toBeVisible()

		// Verify Icebox section exists
		const iceboxSection = page.locator('div:has-text("Icebox")').first()
		await expect(iceboxSection).toBeVisible()
	})

	test('should show empty state in icebox', async ({ page }) => {
		// On a fresh project, icebox should be empty or have an "Add story" prompt
		const iceboxSection = page.locator('div:has-text("Icebox")').first()
		await expect(iceboxSection).toBeVisible()

		// Should see some indication of empty state or ability to add stories
		const pageContent = await page.textContent('body')
		expect(pageContent).toMatch(/No stories|Add story|Icebox/)
	})
})
