import { chromium } from '@playwright/test'
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from './utils/fixtures'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots')
const BASE_URL = process.env.BASE_URL || 'http://localhost:5155'

async function captureScreenshots() {
	// Ensure screenshots directory exists
	if (!fs.existsSync(SCREENSHOTS_DIR)) {
		fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
	}

	const browser = await chromium.launch()
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	})
	const page = await context.newPage()

	console.log(`Using base URL: ${BASE_URL}`)
	console.log('Capturing screenshots...\n')

	// 1. Homepage/Landing
	console.log('1. Homepage/Landing...')
	await page.goto(BASE_URL)
	await page.waitForLoadState('networkidle')
	await page.waitForTimeout(1000)
	await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-homepage.png'), fullPage: true })
	console.log('   Done: 01-homepage.png')

	// 2. Login page
	console.log('2. Login page...')
	await page.goto(`${BASE_URL}/login`)
	await page.waitForLoadState('networkidle')
	await page.waitForTimeout(1000)
	await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-login.png'), fullPage: true })
	console.log('   Done: 02-login.png')

	// 3. Signup page
	console.log('3. Signup page...')
	await page.goto(`${BASE_URL}/signup`)
	await page.waitForLoadState('networkidle')
	await page.waitForTimeout(1000)
	await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-signup.png'), fullPage: true })
	console.log('   Done: 03-signup.png')

	// Login for authenticated screens
	console.log('\nLogging in...')
	await page.goto(`${BASE_URL}/login`)
	await page.waitForLoadState('networkidle')
	await page.waitForTimeout(2000)

	const emailInput = page.getByPlaceholder('Email')
	await emailInput.click()
	await emailInput.type(TEST_USER_EMAIL)

	const passwordInput = page.getByPlaceholder('Password')
	await passwordInput.click()
	await passwordInput.type(TEST_USER_PASSWORD)

	await page.getByRole('button', { name: 'Log In' }).click()
	await page.waitForURL(/\/tracker/, { timeout: 15000 })
	console.log('Logged in successfully\n')

	// 4. Projects list
	console.log('4. Projects list...')
	await page.goto(`${BASE_URL}/tracker`)
	await page.waitForLoadState('networkidle')
	await page.waitForTimeout(1500)
	await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-projects-list.png'), fullPage: true })
	console.log('   Done: 04-projects-list.png')

	// 5. Create project page
	console.log('5. Create project page...')
	await page.goto(`${BASE_URL}/tracker/new`)
	await page.waitForLoadState('networkidle')
	await page.waitForTimeout(1000)
	await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-create-project.png'), fullPage: true })
	console.log('   Done: 05-create-project.png')

	// Create a project to capture the board
	console.log('\nCreating test project for board screenshots...')
	const projectName = `UI Review Project ${Date.now()}`
	await page.fill('input[name="name"]', projectName)
	await page.locator('button[type="submit"]').click()
	await page.waitForURL(/\/tracker\/[a-z0-9]{10,}/, { timeout: 15000 })
	await page.waitForLoadState('networkidle')
	await page.waitForTimeout(1500)

	// 6. Project board (empty state)
	console.log('6. Project board (empty)...')
	await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-project-board-empty.png'), fullPage: true })
	console.log('   Done: 06-project-board-empty.png')

	// 7. Add story dialog
	console.log('7. Add story dialog...')
	const addButton = page.locator('button[aria-label="Add story"]').first()
	await addButton.click()
	await page.waitForSelector('input#title', { state: 'visible' })
	await page.waitForTimeout(500)
	await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-add-story-dialog.png'), fullPage: true })
	console.log('   Done: 07-add-story-dialog.png')

	// Create a story for expanded view
	console.log('\nCreating test story...')
	await page.fill('input#title', 'Sample Feature Story')
	await page.fill('textarea#description', 'This is a sample description for the story.')
	await page.click('button[type="submit"]:has-text("Add Story")')
	await page.waitForTimeout(1000)

	// 8. Story card in board
	console.log('8. Project board with story...')
	await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-project-board-with-story.png'), fullPage: true })
	console.log('   Done: 08-project-board-with-story.png')

	// 9. Expanded story view
	console.log('9. Expanded story view...')
	const storyCard = page.locator('text=Sample Feature Story')
	await storyCard.click()
	await page.waitForTimeout(500)
	await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-story-expanded.png'), fullPage: true })
	console.log('   Done: 09-story-expanded.png')

	// 10. Story with state (Start it)
	console.log('10. Story after starting...')
	const startButton = page.locator('button:has-text("Start")').first()
	await startButton.click()
	await page.waitForLoadState('networkidle')
	await page.waitForTimeout(1000)
	await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-story-started.png'), fullPage: true })
	console.log('   Done: 10-story-started.png')

	await browser.close()

	console.log('\n✓ All screenshots captured!')
	console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`)
}

captureScreenshots().catch(console.error)
