import { expect, type Page } from '@playwright/test'

// Shared account, created by global-setup. It accumulates projects across runs, so use
// signupFreshUser() for anything that needs a clean slate.
export const TEST_USER_EMAIL = 'e2e-test@test.leantracker.app'
export const TEST_USER_PASSWORD = 'TestPassword123!'

export function generateTestEmail(): string {
	return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.leantracker.app`
}

// Root App stamps data-hydrated on <html> once React has attached handlers (app/root.tsx)
export async function waitForHydration(page: Page, timeout = 30_000): Promise<void> {
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true', { timeout })
}

// Login and signup are rate limited per cf-connecting-ip (10/min). Locally every test shares one IP, so
// give each auth attempt its own. Cloudflare overwrites this header in production, so it only matters here.
export async function useFreshClientIp(page: Page): Promise<void> {
	const octet = () => Math.floor(Math.random() * 254) + 1
	await page.context().setExtraHTTPHeaders({ 'cf-connecting-ip': `10.${octet()}.${octet()}.${octet()}` })
}

export async function fillAuthForm(page: Page, email: string, password: string): Promise<void> {
	const emailInput = page.getByPlaceholder('Email')
	const passwordInput = page.getByPlaceholder('Password')
	await emailInput.waitFor({ state: 'visible' })
	await emailInput.fill(email)
	await expect(emailInput).toHaveValue(email)
	await passwordInput.fill(password)
	await expect(passwordInput).toHaveValue(password)
}

export async function login(page: Page, email = TEST_USER_EMAIL, password = TEST_USER_PASSWORD): Promise<void> {
	await useFreshClientIp(page)
	await page.goto('/login')
	await waitForHydration(page)
	await fillAuthForm(page, email, password)
	await page.getByRole('button', { name: 'Log In' }).click()
	await page.waitForURL(/\/tracker/, { timeout: 15000 })
}

export async function signup(page: Page, email: string, password: string): Promise<void> {
	await useFreshClientIp(page)
	await page.goto('/signup')
	await waitForHydration(page)
	await fillAuthForm(page, email, password)
	await page.getByRole('button', { name: 'Create Account' }).click()
	await page.waitForURL(/\/tracker/, { timeout: 15000 })
}

// A brand new account with no projects
export async function signupFreshUser(page: Page): Promise<{ email: string; password: string }> {
	const email = generateTestEmail()
	const password = TEST_USER_PASSWORD
	await signup(page, email, password)
	await page.waitForURL('/tracker/new')
	return { email, password }
}

export const PROJECT_URL = /\/tracker\/[a-z0-9]{10,}$/

// Creates a project via /tracker/new and returns its id from the board URL
export async function createProject(page: Page, name: string): Promise<string> {
	await page.goto('/tracker/new')
	await waitForHydration(page)
	await page.getByLabel('Project Name').fill(name)
	await page.getByRole('button', { name: 'Create Project' }).click()
	await page.waitForURL(PROJECT_URL, { timeout: 15000 })
	return new URL(page.url()).pathname.split('/').pop() ?? ''
}
