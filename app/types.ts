import { z } from 'zod'

export const redirectToKey = 'redirectTo'

export const PasswordSchema = z
	.string()
	.min(1, { message: 'Password is required' })
	.min(6, { message: 'Password is too short' })
	.max(100, { message: 'Password is too long' })
export type PasswordSchema = z.infer<typeof PasswordSchema>

export const EmailSchema = z.string().min(1, { message: 'Email is required' }).email({ message: 'Invalid email address' })
export type EmailSchema = z.infer<typeof EmailSchema>

export function getRedirectToFromSearchParams(searchParams: URLSearchParams) {
	return searchParams.get(redirectToKey)
}
