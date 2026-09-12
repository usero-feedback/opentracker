/**
 * Seed script for preview databases
 * Creates bootstrap data: a test user, client, and some sample feedback
 *
 * This script uses Prisma types to generate type-safe SQL for D1 databases.
 * It outputs SQL statements that can be executed via wrangler.
 */

import type { Prisma } from '@prisma/client'
import { writeFileSync } from 'fs'
import { join } from 'path'

function escapeString(str: string | null | undefined): string {
	if (str === null || str === undefined) return 'NULL'
	return `'${str.replace(/'/g, "''")}'`
}

function toSQLValue(value: unknown): string {
	if (value === null || value === undefined) return 'NULL'
	if (typeof value === 'boolean') return value ? '1' : '0'
	if (typeof value === 'number') return String(value)
	if (value instanceof Date) return escapeString(value.toISOString())
	return escapeString(String(value))
}

async function generateSeedSQL() {
	console.log('🌱 Generating seed SQL for preview database...')

	// Test user data (from requirements)
	const userId = 'cmi9v6k2e0000vz0coix7re2g'
	const userEmail = 'admin@example.com'
	const passwordHash = 'a6aaa3336f85676d0a7dada5a8b721db:8dd156592cd4244130ffdcfd344384751dc57fc546b9195a24ed4514cf1c10e2'
	const userCreatedAt = new Date('2025-11-22T05:44:21.782+00:00')
	const userUpdatedAt = new Date('2025-11-22T05:44:21.782+00:00')

	// Type-safe user data
	const userData: Prisma.UserCreateInput = {
		id: userId,
		email: userEmail,
		password: passwordHash,
		createdAt: userCreatedAt,
		updatedAt: userUpdatedAt,
	}

	// Type-safe client data
	const clientData: Omit<Prisma.ClientCreateInput, 'user'> & { userId: string } = {
		id: 'preview_client_001',
		name: 'Preview Test Client',
		clientId: 'test-client-preview',
		userId: userId,
		allowedDomains: JSON.stringify(['example.com', 'localhost:5173']),
		settings: JSON.stringify({
			theme: 'light',
			position: 'bottom-right',
		}),
	}

	// Type-safe feedback data
	const feedbacksData: Array<Omit<Prisma.FeedbackCreateInput, 'client'> & { clientId: string }> = [
		{
			rating: 3,
			comment: 'Great app! Love the UI and the feedback widget is very smooth.',
			shareEmail: true,
			userEmail: 'happy.user@example.com',
			pageUrl: 'https://example.com/dashboard',
			pageTitle: 'Dashboard',
			clientId: clientData.clientId,
			resolved: false,
			aiProcessed: false,
		},
		{
			rating: 2,
			comment: "The app is okay but I noticed the dark mode toggle doesn't save my preference.",
			shareEmail: true,
			userEmail: 'tester@example.com',
			pageUrl: 'https://example.com/settings',
			pageTitle: 'Settings',
			clientId: clientData.clientId,
			resolved: false,
			aiProcessed: false,
		},
		{
			rating: 1,
			comment: 'Page takes forever to load, very frustrating experience.',
			shareEmail: false,
			pageUrl: 'https://example.com/home',
			pageTitle: 'Home',
			clientId: clientData.clientId,
			resolved: false,
			aiProcessed: false,
		},
		{
			rating: 3,
			comment: 'Would love to see an export to CSV feature for the feedback data!',
			shareEmail: true,
			userEmail: 'poweruser@example.com',
			pageUrl: 'https://example.com/feedback',
			pageTitle: 'Feedback List',
			clientId: clientData.clientId,
			resolved: false,
			aiProcessed: false,
		},
		{
			rating: 2,
			comment: 'Interface could be more intuitive for new users.',
			shareEmail: false,
			pageUrl: 'https://example.com/onboarding',
			pageTitle: 'Onboarding',
			clientId: clientData.clientId,
			resolved: false,
			aiProcessed: false,
		},
	]

	// Generate SQL statements
	const sqlStatements: string[] = []

	// Insert user
	sqlStatements.push(
		`INSERT INTO User (id, email, password, createdAt, updatedAt) VALUES (${toSQLValue(userData.id)}, ${toSQLValue(userData.email)}, ${toSQLValue(userData.password)}, ${toSQLValue(userData.createdAt)}, ${toSQLValue(userData.updatedAt)});`,
	)

	// Insert client
	const now = new Date().toISOString()
	sqlStatements.push(
		`INSERT INTO Client (id, name, clientId, userId, allowedDomains, settings, createdAt, updatedAt) VALUES (${toSQLValue(clientData.id)}, ${toSQLValue(clientData.name)}, ${toSQLValue(clientData.clientId)}, ${toSQLValue(clientData.userId)}, ${toSQLValue(clientData.allowedDomains)}, ${toSQLValue(clientData.settings)}, ${toSQLValue(now)}, ${toSQLValue(now)});`,
	)

	// Insert feedbacks
	feedbacksData.forEach((feedback, index) => {
		const feedbackId = `preview_feedback_${String(index + 1).padStart(3, '0')}`
		sqlStatements.push(
			`INSERT INTO Feedback (id, rating, comment, shareEmail, userEmail, pageUrl, pageTitle, clientId, resolved, aiProcessed, createdAt) VALUES (${toSQLValue(feedbackId)}, ${toSQLValue(feedback.rating)}, ${toSQLValue(feedback.comment)}, ${toSQLValue(feedback.shareEmail)}, ${toSQLValue(feedback.userEmail)}, ${toSQLValue(feedback.pageUrl)}, ${toSQLValue(feedback.pageTitle)}, ${toSQLValue(feedback.clientId)}, ${toSQLValue(feedback.resolved)}, ${toSQLValue(feedback.aiProcessed)}, ${toSQLValue(now)});`,
		)
	})

	// Write to file
	const sqlContent = sqlStatements.join('\n')
	const outputPath = join(process.cwd(), 'scripts', 'seed-preview.sql')
	writeFileSync(outputPath, sqlContent)

	console.log('✅ Seed SQL generated successfully!')
	console.log(`\nGenerated:`)
	console.log(`  - 1 user (${userData.email})`)
	console.log(`  - 1 client (${clientData.name})`)
	console.log(`  - ${feedbacksData.length} sample feedbacks`)
	console.log(`\nSQL file: ${outputPath}`)

	return outputPath
}

generateSeedSQL()
	.then(path => {
		console.log('\n✨ Generation complete!')
		console.log(`Run: npx wrangler d1 execute <db-name> --remote --file=${path}`)
		process.exit(0)
	})
	.catch(error => {
		console.error('❌ Generation failed:', error)
		process.exit(1)
	})
