import { useRouteLoaderData } from 'react-router'
import { z } from 'zod'
import { ModalState } from '~/types/ModalTypes'
import { isNullOrUndefined } from '~/utils/typecheck'

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

// Feedback-related types
export const FeedbackRating = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
export type FeedbackRating = z.infer<typeof FeedbackRating>

export const ScreenshotDataSchema = z.object({
	fileName: z.string(),
	url: z.string(),
	fileSize: z.number(),
	width: z.number().optional(),
	height: z.number().optional(),
	mimeType: z.string(),
})
export type ScreenshotDataSchema = z.infer<typeof ScreenshotDataSchema>

export const FeedbackSubmissionSchema = z.object({
	clientId: z.string(),
	rating: FeedbackRating,
	comment: z.string().optional(),
	shareEmail: z.boolean().default(false),
	userEmail: z.string().email().optional(),
	pageUrl: z.string().optional(),
	pageTitle: z.string().optional(),
	referrer: z.string().optional(),
	environment: z.string().optional(),
	screenshots: z.array(ScreenshotDataSchema).optional(),
})
export type FeedbackSubmissionSchema = z.infer<typeof FeedbackSubmissionSchema>

export const ClientCreationSchema = z.object({
	name: z.string().min(1, { message: 'Client name is required' }).max(100),
	allowedDomains: z.array(z.string()).default([]),
	settings: z.record(z.string(), z.unknown()).default({}),
})
export type ClientCreationSchema = z.infer<typeof ClientCreationSchema>

export const ClientActionSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('updateClient'),
		name: z.string().min(1).max(100).optional(),
		allowedDomains: z.array(z.string()).optional(),
		settings: z.record(z.string(), z.unknown()).optional(),
	}),
	z.object({
		type: z.literal('resolveFeedback'),
		feedbackId: z.string(),
		resolved: z.boolean(),
	}),
	z.object({
		type: z.literal('createPR'),
		feedbackId: z.string(),
		guidance: z.string().optional(),
	}),
])
export type ClientActionSchema = z.infer<typeof ClientActionSchema>

// Keep for backwards compatibility
export const ClientUpdateSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	allowedDomains: z.array(z.string()).optional(),
	settings: z.record(z.string(), z.unknown()).optional(),
})
export type ClientUpdateSchema = z.infer<typeof ClientUpdateSchema>

export const ClientSettingsSchema = z.object({
	name: z.string().min(1, { message: 'Client name is required' }).max(100),
	allowedDomains: z.array(z.string()).default([]),
	requireEmail: z.boolean().default(false),
})
export type ClientSettingsSchema = z.infer<typeof ClientSettingsSchema>

// Frontend data types
export interface FeedbackScreenshot {
	id: string
	fileName: string
	originalUrl: string
	fileSize: number
	mimeType: string
	width?: number
	height?: number
	createdAt: string
}

export interface FeedbackItem {
	id: string
	rating: FeedbackRating
	comment?: string
	shareEmail: boolean
	userEmail?: string
	pageUrl?: string
	pageTitle?: string
	environment?: string
	resolved: boolean
	resolvedAt?: string
	resolvedBy?: string
	createdAt: string
	screenshots?: FeedbackScreenshot[]
}

export interface ClientSummary {
	id: string
	name: string
	clientId: string
	allowedDomains: string[]
	feedbackCount: number
	averageRating: number
	lastFeedbackAt?: string
	createdAt: string
}

export interface FeedbackAnalytics {
	totalFeedback: number
	averageRating: number
	ratingDistribution: Map<FeedbackRating, number>
	recentFeedback: FeedbackItem[]
	topPages: Array<{
		url: string
		title?: string
		count: number
		averageRating: number
	}>
	trends: Array<{
		date: string
		count: number
		averageRating: number
	}>
}

export type RootLoaderData = {
	modal?: ModalState
}

export const useRootData = () => {
	const rootData = useRouteLoaderData<RootLoaderData>('root')
	if (isNullOrUndefined(rootData)) {
		throw new Error('root data must be defined, is missing')
	}
	return rootData
}

// Rating constants - centralized from widget
export const EMOJI_MAP: Record<FeedbackRating, string> = {
	1: '😞',
	2: '😐',
	3: '😊',
	4: '🤩',
}

export const RATING_LABELS: Record<FeedbackRating, string> = {
	1: 'Needs work',
	2: "It's okay",
	3: 'Pretty good',
	4: 'Amazing!',
}

// Rating helpers
export const getRatingEmoji = (rating: number | null): string => {
	if (rating === null) return '⭐'
	if (rating >= 1 && rating <= 4) {
		return EMOJI_MAP[Math.round(rating) as FeedbackRating]
	}
	// For averaged ratings, map to closest rating
	if (rating <= 1.5) return EMOJI_MAP[1]
	if (rating <= 2.5) return EMOJI_MAP[2]
	if (rating <= 3.5) return EMOJI_MAP[3]
	return EMOJI_MAP[4]
}

export const getRatingLabel = (rating: FeedbackRating): string => {
	return RATING_LABELS[rating]
}

export const getRatingLabelFromNumber = (rating: number | null): string => {
	if (rating === null) return '-'
	if (rating <= 1.5) return RATING_LABELS[1]
	if (rating <= 2.5) return RATING_LABELS[2]
	if (rating <= 3.5) return RATING_LABELS[3]
	return RATING_LABELS[4]
}

export const ProcessAIAction = z.discriminatedUnion('action', [
	z.object({ action: z.literal('process-unprocessed') }),
	z.object({ action: z.literal('update-clusters') }),
	z.object({
		action: z.literal('generate-insights'),
		timeframe: z.enum(['last_24h', 'last_week', 'last_month']).optional(),
	}),
	z.object({ action: z.literal('generate-test-data') }),
	z.object({ action: z.literal('full-refresh') }),
])
export type ProcessAIAction = z.infer<typeof ProcessAIAction>

export type NonEmptyArray<T> = [T, ...T[]]
