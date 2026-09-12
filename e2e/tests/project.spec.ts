import { test, expect } from '@playwright/test'
import { createProject, PROJECT_URL, signupFreshUser, waitForHydration } from '../utils/fixtures'

// Each test signs up a fresh user so the project count is known exactly
test.describe('Project flow', () => {
	test('fresh user is sent from /tracker to /tracker/new, ?list shows the empty list', async ({ page }) => {
		await signupFreshUser(page)
		await expect(page).toHaveURL('/tracker/new')

		await page.goto('/tracker')
		await expect(page).toHaveURL('/tracker/new')
		await expect(page.getByText('Create New Project')).toBeVisible()

		await page.goto('/tracker?list')
		await expect(page).toHaveURL('/tracker?list')
		await expect(page.getByRole('heading', { name: 'Your Projects' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'New Project' })).toBeVisible()
	})

	test('creating a project from /tracker/new lands on its board', async ({ page }) => {
		await signupFreshUser(page)
		const projectName = `Board Project ${Date.now()}`

		await page.goto('/tracker/new')
		await waitForHydration(page)
		await page.getByLabel('Project Name').fill(projectName)
		await page.getByRole('button', { name: 'Create Project' }).click()

		await expect(page).toHaveURL(PROJECT_URL, { timeout: 15000 })
		await expect(page.getByText('Current', { exact: true })).toBeVisible()
		await expect(page.getByText('Icebox', { exact: true }).first()).toBeVisible()
	})

	test('with one project /tracker opens the board and /tracker?list shows the list', async ({ page }) => {
		await signupFreshUser(page)
		const projectName = `Only Project ${Date.now()}`
		const projectId = await createProject(page, projectName)

		await page.goto('/tracker')
		await expect(page).toHaveURL(`/tracker/${projectId}`)
		await expect(page.getByText('Icebox', { exact: true }).first()).toBeVisible()

		await page.goto('/tracker?list')
		await expect(page).toHaveURL('/tracker?list')
		await expect(page.getByRole('heading', { name: 'Your Projects' })).toBeVisible()
		await expect(page.getByRole('link', { name: projectName })).toHaveAttribute('href', `/tracker/${projectId}`)
	})

	test('with two projects /tracker shows the list and links to each board', async ({ page }) => {
		await signupFreshUser(page)
		const first = `First Project ${Date.now()}`
		const second = `Second Project ${Date.now()}`
		const firstId = await createProject(page, first)
		await createProject(page, second)

		await page.goto('/tracker')
		await expect(page).toHaveURL('/tracker')
		await expect(page.getByRole('heading', { name: 'Your Projects' })).toBeVisible()
		await expect(page.getByRole('link', { name: first })).toBeVisible()
		await expect(page.getByRole('link', { name: second })).toBeVisible()

		await page.getByRole('link', { name: first }).click()
		await expect(page).toHaveURL(`/tracker/${firstId}`)
		await expect(page.getByText('Icebox', { exact: true }).first()).toBeVisible()
	})
})
