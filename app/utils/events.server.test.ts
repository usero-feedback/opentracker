import { describe, expect, it, vi } from 'vitest'

// Avoid pulling in the real @aws-sdk/client-ses (broken module resolution in this env, unrelated to this test).
vi.mock('@aws-sdk/client-ses', () => ({ SESClient: class {}, SendEmailCommand: class {} }))

import { formatAdminEmail } from './events.server'

describe('formatAdminEmail sign_up', () => {
	it('uses the email when present', () => {
		const { subject } = formatAdminEmail('sign_up', { method: 'email', email: 'a@b.com', userId: 'u1' })
		expect(subject).toBe('New signup: a@b.com')
	})

	it('falls back to the user id when email is missing, never "undefined"', () => {
		const { subject } = formatAdminEmail('sign_up', { method: 'email', userId: 'u1' })
		expect(subject).toBe('New signup: user u1')
		expect(subject).not.toContain('undefined')
	})

	it('falls back to "unknown" when neither email nor userId is present', () => {
		const { subject } = formatAdminEmail('sign_up', { method: 'email' })
		expect(subject).toBe('New signup: user unknown')
		expect(subject).not.toContain('undefined')
	})
})
