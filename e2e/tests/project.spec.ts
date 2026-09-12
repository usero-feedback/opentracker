import { test, expect } from '@playwright/test'
import { login } from '../utils/fixtures'

/**
 * Project Management E2E Tests
 *
 * Tests project creation and navigation.
 * Uses a pre-created test account for parallel execution.
 */

test.describe('Project Management', () => {
	// Setup: Login with pre-created test account
	test.beforeEach(async ({ page }) => {
		await login(page)
	})

	test('should create a new project', async ({ page }) => {
		const projectName = `Test Project ${Date.now()}`

		// Should be on tracker page showing empty state or projects list
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000) // Wait for React hydration

		// Click on "Create Project" or "New Project" button
		const createButton = page
			.locator('a[href="/tracker/new"], button:has-text("Create Project"), a:has-text("New Project")')
			.first()
		await createButton.click()

		// Should navigate to /tracker/new
		await expect(page).toHaveURL('/tracker/new')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000) // Wait for React hydration

		// Fill in project form
		await page.fill('input[name="name"]', projectName)

		// Submit the form
		await page.locator('button[type="submit"]').click()

		// Should redirect to the project board (cuid is ~25 chars, "new" is only 3)
		await expect(page).toHaveURL(/\/tracker\/[a-z0-9]{10,}/, { timeout: 15000 })
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000) // Wait for content to render

		// Should see project board with Current/Icebox columns
		await expect(page.getByText('Current', { exact: true })).toBeVisible()
		await expect(page.getByText('Icebox', { exact: true }).first()).toBeVisible()
	})

	test('should show project in projects list', async ({ page }) => {
		const projectName = `List Project ${Date.now()}`

		// Create a project
		await page.goto('/tracker/new')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)
		await page.fill('input[name="name"]', projectName)
		await page.locator('button[type="submit"]').click()
		await page.waitForURL(/\/tracker\/[a-z0-9]{10,}/, { timeout: 15000 })

		// Navigate back to projects list
		await page.goto('/tracker')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)

		// Should see the project in the list
		const projectCard = page.locator(`text=${projectName}`)
		await expect(projectCard).toBeVisible()
	})

	test('should navigate to project board from projects list', async ({ page }) => {
		const projectName = `Nav Project ${Date.now()}`

		// Create a project
		await page.goto('/tracker/new')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)
		await page.fill('input[name="name"]', projectName)
		await page.locator('button[type="submit"]').click()
		await page.waitForURL(/\/tracker\/[a-z0-9]{10,}/, { timeout: 15000 })

		// Get the project ID from URL
		const projectUrl = page.url()
		const projectId = projectUrl.split('/').pop()

		// Navigate to projects list
		await page.goto('/tracker')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)

		// Click on the project (it's a link)
		await page.click(`a[href="/tracker/${projectId}"]`)

		// Should navigate to project board
		await expect(page).toHaveURL(`/tracker/${projectId}`)
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(1000) // Wait for content to render

		// Should see the tracker board
		await expect(page.getByText('Current', { exact: true })).toBeVisible()
		await expect(page.getByText('Icebox', { exact: true }).first()).toBeVisible()
	})

	test('should create multiple projects and show them all', async ({ page }) => {
		const project1Name = `Multi Project 1 ${Date.now()}`
		const project2Name = `Multi Project 2 ${Date.now()}`

		// Create first project
		await page.goto('/tracker/new')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)
		await page.fill('input[name="name"]', project1Name)
		await page.locator('button[type="submit"]').click()
		await page.waitForURL(/\/tracker\/[a-z0-9]{10,}/, { timeout: 15000 })

		// Create second project
		await page.goto('/tracker/new')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)
		await page.fill('input[name="name"]', project2Name)
		await page.locator('button[type="submit"]').click()
		await page.waitForURL(/\/tracker\/[a-z0-9]{10,}/, { timeout: 15000 })

		// Navigate to projects list
		await page.goto('/tracker')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)

		// Should see both projects
		await expect(page.locator(`text=${project1Name}`)).toBeVisible()
		await expect(page.locator(`text=${project2Name}`)).toBeVisible()

		// Should see the heading "Your Projects"
		await expect(page.locator('h1:has-text("Your Projects")')).toBeVisible()
	})
})
