import { z } from 'zod'

// Queue message types for different processing tasks
export const QueueMessage = z.discriminatedUnion('type', [
	// AI Processing Messages
	// Process new feedback for clustering
	z.object({
		type: z.literal('process-feedback'),
		feedbackIds: z.array(z.string()),
		clientId: z.string(),
		triggeredBy: z.enum(['feedback_submission', 'batch_processing', 'manual']),
		timestamp: z.number(),
	}),

	// Update existing clusters (run periodically)
	z.object({
		type: z.literal('update-clusters'),
		clientId: z.string(),
		triggeredBy: z.enum(['schedule', 'manual']),
		timestamp: z.number(),
	}),

	// Generate insights and trends
	z.object({
		type: z.literal('generate-insights'),
		clientId: z.string(),
		timeframe: z.enum(['last_24h', 'last_week', 'last_month']),
		triggeredBy: z.enum(['schedule', 'manual']),
		timestamp: z.number(),
	}),

	// GitHub PR Creation Messages
	// Create PR from feedback
	z.object({
		type: z.literal('create-pr-feedback'),
		feedbackId: z.string(),
		clientId: z.string(),
		guidance: z.string().optional(),
		triggeredBy: z.enum(['manual']),
		timestamp: z.number(),
	}),

	// Create PR from insight
	z.object({
		type: z.literal('create-pr-insight'),
		insightId: z.string(),
		clientId: z.string(),
		triggeredBy: z.enum(['manual']),
		timestamp: z.number(),
	}),
])

// Backward compatibility
export const FeedbackAIMessage = QueueMessage

export type QueueMessage = z.infer<typeof QueueMessage>
export type FeedbackAIMessage = z.infer<typeof FeedbackAIMessage>

// Specific message types for type safety
export type ProcessFeedbackMessage = Extract<QueueMessage, { type: 'process-feedback' }>
export type UpdateClustersMessage = Extract<QueueMessage, { type: 'update-clusters' }>
export type GenerateInsightsMessage = Extract<QueueMessage, { type: 'generate-insights' }>
export type CreatePRFeedbackMessage = Extract<QueueMessage, { type: 'create-pr-feedback' }>
export type CreatePRInsightMessage = Extract<QueueMessage, { type: 'create-pr-insight' }>
