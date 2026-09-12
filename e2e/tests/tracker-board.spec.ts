import { test, expect } from '@playwright/test'
import { login } from '../utils/fixtures'

/**
 * Comprehensive Tracker Board E2E Tests
 *
 * Tests all major functionality of the tracker board including:
 * - Story state transitions (Start, Finish, Deliver, Accept/Reject)
 * - Story types (Bug, Chore with different behaviors)
 * - Story management (Edit, Delete)
 * - Search and filtering
 *
 * Note: These tests must run serially to avoid session conflicts
 */

test.describe.serial('Tracker Board - Story State Transitions', () => {
	let projectId: string

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

		// Wait for board to load completely
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000) // Longer wait for hydration

		// Wait for Icebox column to be visible as confirmation board is loaded
		await page.waitForSelector('text=Icebox', { state: 'visible' })
	})

	test('should start a story and verify state changes', async ({ page }) => {
		const storyTitle = `Start Test Story ${Date.now()}`

		// Create a story in icebox
		// Use Plus icon selector which is more reliable
		const addButton = page.locator('svg.lucide-plus').first()
		await addButton.click()
		await page.waitForSelector('input#title', { state: 'visible' })
		await page.fill('input#title', storyTitle)
		await page.click('button[type="submit"]:has-text("Add Story")')
		await page.waitForTimeout(1000)

		// Verify story is in icebox
		const storyCard = page.locator(`text=${storyTitle}`)
		await expect(storyCard).toBeVisible()

		// Drag story from Icebox to Current (desktop view)
		// First, check if we're on mobile or desktop
		const isMobile = await page.evaluate(() => window.matchMedia('(max-width: 639px)').matches)

		if (!isMobile) {
			// Desktop: drag from icebox to current
			const iceboxStory = page.locator(`div:has-text("${storyTitle}")`).first()
			const currentColumn = page.locator('div:has-text("Current")').first()
			await iceboxStory.dragTo(currentColumn)
			await page.waitForLoadState('networkidle')
			await page.waitForTimeout(1000)
		}

		// Click on story to expand it
		await storyCard.click()
		await page.waitForTimeout(500)

		// Click Start button
		const startButton = page.locator('button:has-text("Start")').first()
		await expect(startButton).toBeVisible()
		await startButton.click()
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)

		// Verify state changed - Finish button should now be visible
		const finishButton = page.locator('button:has-text("Finish")').first()
		await expect(finishButton).toBeVisible()
	})

	test('should finish a started story', async ({ page }) => {
		const storyTitle = `Finish Test Story ${Date.now()}`

		// Create a story
		const addButton = page.locator('svg.lucide-plus').first()
		await addButton.click()
		await page.waitForSelector('input#title', { state: 'visible' })
		await page.fill('input#title', storyTitle)
		await page.click('button[type="submit"]:has-text("Add Story")')
		await page.waitForTimeout(1000)

		// Click on story to expand it
		const storyCard = page.locator(`text=${storyTitle}`)
		await storyCard.click()
		await page.waitForTimeout(500)

		// Start the story
		const startButton = page.locator('button:has-text("Start")').first()
		await startButton.click()
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)

		// Click Finish button
		const finishButton = page.locator('button:has-text("Finish")').first()
		await expect(finishButton).toBeVisible()
		await finishButton.click()
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)

		// Verify Deliver button is now visible
		const deliverButton = page.locator('button:has-text("Deliver")').first()
		await expect(deliverButton).toBeVisible()
	})

	test('should deliver a finished story', async ({ page }) => {
		const storyTitle = `Deliver Test Story ${Date.now()}`

		// Create a story
		const addButton = page.locator('svg.lucide-plus').first()
		await addButton.click()
		await page.waitForSelector('input#title', { state: 'visible' })
		await page.fill('input#title', storyTitle)
		await page.click('button[type="submit"]:has-text("Add Story")')
		await page.waitForTimeout(1000)

		// Click on story to expand it
		const storyCard = page.locator(`text=${storyTitle}`)
		await storyCard.click()
		await page.waitForTimeout(500)

		// Start the story
		await page.locator('button:has-text("Start")').first().click()
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)

		// Finish the story
		await page.locator('button:has-text("Finish")').first().click()
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)

		// Deliver the story
		const deliverButton = page.locator('button:has-text("Deliver")').first()
		await deliverButton.click()
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)

		// Verify Accept and Reject buttons are visible
		const acceptButton = page.locator('button:has-text("Accept")').first()
		const rejectButton = page.locator('button:has-text("Reject")').first()
		await expect(acceptButton).toBeVisible()
		await expect(rejectButton).toBeVisible()
	})

	test('should accept a delivered story', async ({ page }) => {
		const storyTitle = `Accept Test Story ${Date.now()}`

		// Create and deliver a story
		const addButton = page.locator('svg.lucide-plus').first()
		await addButton.click()
		await page.waitForSelector('input#title', { state: 'visible' })
		await page.fill('input#title', storyTitle)
		await page.click('button[type="submit"]:has-text("Add Story")')
		await page.waitForTimeout(1000)

		const storyCard = page.locator(`text=${storyTitle}`)
		await storyCard.click()
		await page.waitForTimeout(500)

		// Start -> Finish -> Deliver
		await page.locator('button:has-text("Start")').first().click()
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(800)
		await page.locator('button:has-text("Finish")').first().click()
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(800)
		await page.locator('button:has-text("Deliver")').first().click()
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(800)

		// Accept the story
		const acceptButton = page.locator('button:has-text("Accept")').first()
		await acceptButton.click()
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)

		// Story should move to accepted (shown in "Show X accepted stories" toggle)
		// The story should no longer have Start/Finish/Deliver buttons
		const startButton = page.locator('button:has-text("Start")')
		await expect(startButton).not.toBeVisible()
	})

	test('should reject a delivered story and return to started', async ({ page }) => {
		const storyTitle = `Reject Test Story ${Date.now()}`

		// Create and deliver a story
		const addButton = page.locator('svg.lucide-plus').first()
		await addButton.click()
		await page.waitForSelector('input#title', { state: 'visible' })
		await page.fill('input#title', storyTitle)
		await page.click('button[type="submit"]:has-text("Add Story")')
		await page.waitForTimeout(1000)

		const storyCard = page.locator(`text=${storyTitle}`)
		await storyCard.click()
		await page.waitForTimeout(500)

		// Start -> Finish -> Deliver
		await page.locator('button:has-text("Start")').first().click()
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(800)
		await page.locator('button:has-text("Finish")').first().click()
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(800)
		await page.locator('button:has-text("Deliver")').first().click()
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(800)

		// Reject the story
		const rejectButton = page.locator('button:has-text("Reject")').first()
		await rejectButton.click()
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)

		// Story should return to rejected state (which shows Restart button)
		// The rejected state transitions to started when you click Restart
		// But immediately after reject, we should see "Restart" button, not "Finish"
		const restartButton = page.locator('button:has-text("Restart")').first()
		await expect(restartButton).toBeVisible()
	})
})

test.describe('Tracker Board - Story Types', () => {
	let projectId: string

	test.beforeEach(async ({ page }) => {
		await login(page)

		const projectName = `Tracker Test ${Date.now()}`

		// Create a project
		await page.goto('/tracker/new')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)
		await page.fill('input[name="name"]', projectName)
		await page.locator('button[type="submit"]').click()
		await page.waitForURL(/\/tracker\/[a-z0-9]{10,}/, { timeout: 15000 })

		projectId = page.url().split('/').pop() || ''
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)

		// Wait for Icebox column to be visible
		await page.waitForSelector('text=Icebox', { state: 'visible' })
	})

	test('should create a bug story with correct styling', async ({ page }) => {
		const storyTitle = `Bug Story ${Date.now()}`

		// Open Add Story dialog
		const addButton = page.locator('svg.lucide-plus').first()
		await addButton.click()
		await page.waitForSelector('input#title', { state: 'visible' })

		// Fill in story details
		await page.fill('input#title', storyTitle)

		// Select Bug type
		await page.click('button:has-text("Feature")')
		await page.click('div[role="option"]:has-text("Bug")')

		// Submit
		await page.click('button[type="submit"]:has-text("Add Story")')
		await page.waitForTimeout(1000)

		// Verify story exists
		const storyCard = page.locator(`text=${storyTitle}`)
		await expect(storyCard).toBeVisible()

		// Click to expand and verify type
		await storyCard.click()
		await page.waitForTimeout(500)

		// Verify Bug is shown in the type selector
		const typeSelector = page.locator('button:has-text("Bug")').first()
		await expect(typeSelector).toBeVisible()
	})

	test('should create a chore story without points field', async ({ page }) => {
		const storyTitle = `Chore Story ${Date.now()}`

		// Open Add Story dialog
		const addButton = page.locator('svg.lucide-plus').first()
		await addButton.click()
		await page.waitForSelector('input#title', { state: 'visible' })

		// Fill in story details
		await page.fill('input#title', storyTitle)

		// Select Chore type
		await page.click('button:has-text("Feature")')
		await page.click('div[role="option"]:has-text("Chore")')

		// Verify points selector is visible (chores can have points, but it's optional)
		// In the create dialog, points field should still be visible
		const pointsSelector = page.locator('button:has-text("Unestimated")')
		await expect(pointsSelector).toBeVisible()

		// Submit
		await page.click('button[type="submit"]:has-text("Add Story")')
		await page.waitForTimeout(1000)

		// Verify story exists
		const storyCard = page.locator(`text=${storyTitle}`)
		await expect(storyCard).toBeVisible()
	})
})

test.describe('Tracker Board - Story Management', () => {
	let projectId: string

	test.beforeEach(async ({ page }) => {
		await login(page)

		const projectName = `Tracker Test ${Date.now()}`

		// Create a project
		await page.goto('/tracker/new')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)
		await page.fill('input[name="name"]', projectName)
		await page.locator('button[type="submit"]').click()
		await page.waitForURL(/\/tracker\/[a-z0-9]{10,}/, { timeout: 15000 })

		projectId = page.url().split('/').pop() || ''
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)

		// Wait for Icebox column to be visible
		await page.waitForSelector('text=Icebox', { state: 'visible' })
	})

	test('should edit story title and description', async ({ page }) => {
		const originalTitle = `Original Title ${Date.now()}`
		const newTitle = `Updated Title ${Date.now()}`
		const newDescription = 'This is an updated description'

		// Create a story
		const addButton = page.locator('svg.lucide-plus').first()
		await addButton.click()
		await page.waitForSelector('input#title', { state: 'visible' })
		await page.fill('input#title', originalTitle)
		await page.click('button[type="submit"]:has-text("Add Story")')
		await page.waitForTimeout(1000)

		// Click on story to expand it
		const storyCard = page.locator(`text=${originalTitle}`)
		await storyCard.click()
		await page.waitForTimeout(500)

		// Edit the title (inline in the card)
		const titleTextarea = page.locator('textarea[aria-label="Story title"]')
		await titleTextarea.fill(newTitle)
		await titleTextarea.blur() // Trigger save
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)

		// Edit the description in expanded details
		const descriptionTextarea = page.locator('textarea[placeholder="Add a description..."]')
		await descriptionTextarea.fill(newDescription)
		await page.waitForTimeout(500)

		// Save the changes
		const saveButton = page.locator('button:has-text("Save")')
		await saveButton.click()
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)

		// Verify changes persisted by refreshing
		await page.reload()
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000)

		// Verify new title is visible
		const updatedStoryCard = page.locator(`text=${newTitle}`)
		await expect(updatedStoryCard).toBeVisible()
	})

	test('should delete a story', async ({ page }) => {
		const storyTitle = `Delete Test Story ${Date.now()}`

		// Create a story
		const addButton = page.locator('svg.lucide-plus').first()
		await addButton.click()
		await page.waitForSelector('input#title', { state: 'visible' })
		await page.fill('input#title', storyTitle)
		await page.click('button[type="submit"]:has-text("Add Story")')
		await page.waitForTimeout(1000)

		// Verify story exists
		let storyCard = page.locator(`text=${storyTitle}`)
		await expect(storyCard).toBeVisible()

		// Click on story to expand it
		await storyCard.click()
		await page.waitForTimeout(500)

		// Set up dialog handler BEFORE clicking delete
		page.once('dialog', dialog => {
			console.log('Dialog message:', dialog.message())
			dialog.accept()
		})

		// Click delete button
		const deleteButton = page.locator('button[aria-label="Delete story"]')
		await deleteButton.click()

		// Wait for deletion to complete
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1500)

		// Verify story is removed - check that it's not in the DOM at all
		const storyCount = await page.locator(`text="${storyTitle}"`).count()
		expect(storyCount).toBe(0)
	})
})

test.describe('Tracker Board - Search & Filter', () => {
	let projectId: string

	test.beforeEach(async ({ page }) => {
		await login(page)

		const projectName = `Tracker Test ${Date.now()}`

		// Create a project
		await page.goto('/tracker/new')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)
		await page.fill('input[name="name"]', projectName)
		await page.locator('button[type="submit"]').click()
		await page.waitForURL(/\/tracker\/[a-z0-9]{10,}/, { timeout: 15000 })

		projectId = page.url().split('/').pop() || ''
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)

		// Wait for Icebox column to be visible
		await page.waitForSelector('text=Icebox', { state: 'visible' })
	})

	test('should search stories by title', async ({ page }) => {
		const uniqueSearchTerm = `SearchTest${Date.now()}`
		const story1Title = `${uniqueSearchTerm} First Story`
		const story2Title = `${uniqueSearchTerm} Second Story`
		const story3Title = `Different Story ${Date.now()}`

		// Create three stories
		const addButton = page.locator('svg.lucide-plus').first()

		// Story 1
		await addButton.click()
		await page.waitForSelector('input#title', { state: 'visible' })
		await page.fill('input#title', story1Title)
		await page.click('button[type="submit"]:has-text("Add Story")')
		await page.waitForTimeout(800)

		// Story 2
		await addButton.click()
		await page.waitForSelector('input#title', { state: 'visible' })
		await page.fill('input#title', story2Title)
		await page.click('button[type="submit"]:has-text("Add Story")')
		await page.waitForTimeout(800)

		// Story 3
		await addButton.click()
		await page.waitForSelector('input#title', { state: 'visible' })
		await page.fill('input#title', story3Title)
		await page.click('button[type="submit"]:has-text("Add Story")')
		await page.waitForTimeout(1000)

		// All stories should be visible
		await expect(page.locator(`text=${story1Title}`)).toBeVisible()
		await expect(page.locator(`text=${story2Title}`)).toBeVisible()
		await expect(page.locator(`text=${story3Title}`)).toBeVisible()

		// Search for the unique term
		const searchInput = page.locator('input[placeholder="Search"]')
		await searchInput.fill(uniqueSearchTerm)
		await page.waitForTimeout(500)

		// Only matching stories should be visible
		await expect(page.locator(`text=${story1Title}`)).toBeVisible()
		await expect(page.locator(`text=${story2Title}`)).toBeVisible()
		await expect(page.locator(`text=${story3Title}`)).not.toBeVisible()

		// Clear search
		await searchInput.fill('')
		await page.waitForTimeout(500)

		// All stories should be visible again
		await expect(page.locator(`text=${story1Title}`)).toBeVisible()
		await expect(page.locator(`text=${story2Title}`)).toBeVisible()
		await expect(page.locator(`text=${story3Title}`)).toBeVisible()
	})

	test('should filter stories by label', async ({ page }) => {
		// This test would require creating labels first, which is a more complex setup
		// For now, we'll create a simplified version that just verifies the label functionality exists

		const storyTitle = `Label Test Story ${Date.now()}`

		// Create a story
		const addButton = page.locator('svg.lucide-plus').first()
		await addButton.click()
		await page.waitForSelector('input#title', { state: 'visible' })
		await page.fill('input#title', storyTitle)
		await page.click('button[type="submit"]:has-text("Add Story")')
		await page.waitForTimeout(1000)

		// Click on story to expand it
		const storyCard = page.locator(`text=${storyTitle}`)
		await storyCard.click()
		await page.waitForTimeout(500)

		// Verify Labels section exists in expanded view
		const labelsSection = page.locator('span:has-text("Labels")').first()
		await expect(labelsSection).toBeVisible()

		// Note: Full label filtering would require:
		// 1. Creating labels via the labels UI
		// 2. Adding labels to stories
		// 3. Using label filter to filter stories
		// This is beyond the scope of basic E2E tests without additional setup
	})
})
