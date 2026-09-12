import { test, expect, type Locator, type Page } from '@playwright/test'
import { createProject, signupFreshUser, waitForHydration } from '../utils/fixtures'

type StoryType = 'Feature' | 'Bug' | 'Chore'

// Story cards are role=button with aria-label "Story: <title>"; state buttons live inside the card
const story = (page: Page, title: string): Locator => page.getByRole('button', { name: `Story: ${title}` })

async function addStory(page: Page, title: string, options: { type?: StoryType; description?: string } = {}) {
	await page.locator('[aria-label="Add story"]:visible').first().click()
	const dialog = page.getByRole('dialog', { name: 'Add Story' })
	await expect(dialog).toBeVisible()
	await dialog.locator('#title').fill(title)
	if (options.description) await dialog.locator('#description').fill(options.description)
	if (options.type) {
		await dialog.getByRole('combobox').filter({ hasText: 'Feature' }).click()
		await page.getByRole('option', { name: options.type }).click()
	}
	await dialog.getByRole('button', { name: 'Add Story' }).click()
	await expect(dialog).toBeHidden()
	await expect(story(page, title)).toBeVisible()
}

// Clicking the title text expands the card; the state buttons stop propagation
async function expandStory(page: Page, title: string): Promise<Locator> {
	const card = story(page, title)
	await card.getByText(title, { exact: true }).click()
	await expect(card.getByLabel('Story title')).toBeVisible()
	return card
}

// Cards remount when a story changes column, so let the action and revalidation settle before the next click
async function transition(page: Page, title: string, action: string) {
	const button = story(page, title).getByRole('button', { name: `${action} story` })
	await button.click()
	await expect(button).toBeHidden()
	await page.waitForLoadState('networkidle')
}

test.describe('Tracker board', () => {
	// Fresh user per test so the board starts empty and the shared account does not pile up projects
	test.beforeEach(async ({ page }) => {
		await signupFreshUser(page)
		await createProject(page, `Tracker Test ${Date.now()}`)
		await waitForHydration(page)
		await expect(page.getByText('Icebox', { exact: true }).first()).toBeVisible()
	})

	test.describe('story state transitions', () => {
		test('start shows Finish', async ({ page }) => {
			const title = `Start Test ${Date.now()}`
			await addStory(page, title)
			await transition(page, title, 'Start')
			await expect(story(page, title).getByRole('button', { name: 'Finish story' })).toBeVisible()
		})

		test('finish shows Deliver', async ({ page }) => {
			const title = `Finish Test ${Date.now()}`
			await addStory(page, title)
			await transition(page, title, 'Start')
			await transition(page, title, 'Finish')
			await expect(story(page, title).getByRole('button', { name: 'Deliver story' })).toBeVisible()
		})

		test('deliver shows Accept and Reject', async ({ page }) => {
			const title = `Deliver Test ${Date.now()}`
			await addStory(page, title)
			await transition(page, title, 'Start')
			await transition(page, title, 'Finish')
			await transition(page, title, 'Deliver')
			await expect(story(page, title).getByRole('button', { name: 'Accept story' })).toBeVisible()
			await expect(story(page, title).getByRole('button', { name: 'Reject story' })).toBeVisible()
		})

		test('accept moves the story to Done', async ({ page }) => {
			const title = `Accept Test ${Date.now()}`
			await addStory(page, title)
			await transition(page, title, 'Start')
			await transition(page, title, 'Finish')
			await transition(page, title, 'Deliver')
			await transition(page, title, 'Accept')
			await expect(story(page, title)).toBeHidden()
			const done = page.getByRole('button', { name: /^Done/ })
			await expect(done).toHaveText(/Done\s*1/)
			await done.click()
			await expect(story(page, title)).toBeVisible()
			await expect(story(page, title).getByRole('button', { name: /story$/ })).toHaveCount(0)
		})

		test('reject shows Restart', async ({ page }) => {
			const title = `Reject Test ${Date.now()}`
			await addStory(page, title)
			await transition(page, title, 'Start')
			await transition(page, title, 'Finish')
			await transition(page, title, 'Deliver')
			await transition(page, title, 'Reject')
			await expect(story(page, title).getByRole('button', { name: 'Restart story' })).toBeVisible()
		})
	})

	test.describe('story types', () => {
		test('feature with a description lands in the icebox', async ({ page }) => {
			const title = `Feature ${Date.now()}`
			await addStory(page, title, { description: 'This is a test feature story' })
			const card = await expandStory(page, title)
			await expect(card.getByText('This is a test feature story')).toBeVisible()
		})

		test('bug keeps its type after creation', async ({ page }) => {
			const title = `Bug ${Date.now()}`
			await addStory(page, title, { type: 'Bug' })
			const card = await expandStory(page, title)
			await expect(card.getByRole('combobox').filter({ hasText: 'Bug' })).toBeVisible()
		})

		test('chore still offers points in the dialog', async ({ page }) => {
			const title = `Chore ${Date.now()}`
			await page.locator('[aria-label="Add story"]:visible').first().click()
			const dialog = page.getByRole('dialog', { name: 'Add Story' })
			await dialog.locator('#title').fill(title)
			await dialog.getByRole('combobox').filter({ hasText: 'Feature' }).click()
			await page.getByRole('option', { name: 'Chore' }).click()
			await expect(dialog.getByRole('combobox').filter({ hasText: 'Unestimated' })).toBeVisible()
			await dialog.getByRole('button', { name: 'Add Story' }).click()
			await expect(story(page, title)).toBeVisible()
		})
	})

	test.describe('story management', () => {
		test('edit title and description, persisted across reload', async ({ page }) => {
			const original = `Original ${Date.now()}`
			const updated = `Updated ${Date.now()}`
			await addStory(page, original)
			const card = await expandStory(page, original)

			const titleField = card.getByLabel('Story title')
			await titleField.fill(updated)
			await titleField.blur()
			await expect(story(page, updated)).toBeVisible()

			const edited = story(page, updated)
			await edited.getByText('Click to add a description...').click()
			await edited.getByPlaceholder('Add a description... (Markdown supported)').fill('An updated description')
			await edited.getByRole('button', { name: 'Save' }).click()

			await page.reload()
			await waitForHydration(page)
			const reloaded = await expandStory(page, updated)
			await expect(reloaded.getByText('An updated description')).toBeVisible()
		})

		test('delete removes the story', async ({ page }) => {
			const title = `Delete Test ${Date.now()}`
			await addStory(page, title)
			const card = await expandStory(page, title)
			page.once('dialog', dialog => dialog.accept())
			await card.getByRole('button', { name: 'Delete story' }).click()
			await expect(story(page, title)).toHaveCount(0)
		})
	})

	test.describe('search', () => {
		test('filters stories by title', async ({ page }) => {
			const term = `Needle${Date.now()}`
			const first = `${term} first`
			const second = `${term} second`
			const other = `Hay ${Date.now()}`
			await addStory(page, first)
			await addStory(page, second)
			await addStory(page, other)

			const search = page.locator('input[placeholder="Search"]:visible').first()
			await search.fill(term)
			await expect(story(page, first)).toBeVisible()
			await expect(story(page, second)).toBeVisible()
			await expect(story(page, other)).toBeHidden()

			await search.fill('')
			await expect(story(page, other)).toBeVisible()
		})

		test('expanded story shows the labels row', async ({ page }) => {
			const title = `Label Test ${Date.now()}`
			await addStory(page, title)
			const card = await expandStory(page, title)
			await expect(card.getByText('Labels', { exact: true })).toBeVisible()
		})
	})
})
