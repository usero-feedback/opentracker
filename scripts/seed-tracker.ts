/**
 * Seed script for tracker data (projects + stories)
 * Creates sample data for screenshots and demos
 *
 * Run: npx tsx scripts/seed-tracker.ts
 * Then execute the SQL against your local D1 database
 */

import { execSync } from 'child_process'
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

// Story states: unscheduled, unstarted, started, finished, delivered, accepted, rejected
// Story types: feature, bug, chore

interface Story {
	title: string
	description: string
	type: 'feature' | 'bug' | 'chore' | 'release'
	state: 'unscheduled' | 'unstarted' | 'started' | 'finished' | 'delivered' | 'accepted'
	points?: number
}

async function generateSeedSQL() {
	console.log('🌱 Generating tracker seed SQL...')

	// Use existing user by email (no new user created)
	const userEmail = 'admin@example.com'

	const projectId = 'seed_project_001'
	const projectName = 'The Side Project'

	// Stories organized by panel - fun developer humor titles
	const stories: Story[] = [
		// Current iteration - the grind
		{ title: 'Center the div', description: '', type: 'bug', state: 'accepted', points: 1 },
		{ title: 'Mass update, fix & make great', description: '', type: 'feature', state: 'accepted', points: 3 },
		{ title: 'Copy from StackOverflow, add comments', description: '', type: 'chore', state: 'delivered' },
		{ title: 'Debug why it works on my machine', description: '', type: 'bug', state: 'finished', points: 2 },
		{ title: 'Convince PM that done means done', description: '', type: 'feature', state: 'started', points: 2 },
		{ title: 'Figure out what this regex does', description: '', type: 'chore', state: 'started' },
		{ title: 'Rename variables from a, b, c', description: '', type: 'chore', state: 'unstarted' },
		{ title: 'TODO: remove this TODO', description: '', type: 'bug', state: 'unstarted', points: 1 },

		// Release marker in current
		{ title: 'v1.0 - Ship It Or It Ships You', description: '', type: 'release', state: 'unstarted' },

		// Backlog - the queue of hope
		{ title: 'Resolve 47 merge conflicts', description: '', type: 'chore', state: 'unstarted' },
		{ title: 'Why is this test flaky', description: '', type: 'bug', state: 'unstarted', points: 2 },
		{ title: "Customer says 'make it intuitive'", description: '', type: 'feature', state: 'unstarted', points: 3 },

		// Another release
		{ title: 'v1.1 - The Apology Patch', description: '', type: 'release', state: 'unstarted' },

		{ title: 'Fix CSS on Safari', description: '', type: 'bug', state: 'unstarted', points: 1 },
		{ title: 'Circle back on circling back', description: '', type: 'chore', state: 'unstarted' },
		{ title: 'Cache invalidation (the hard one)', description: '', type: 'feature', state: 'unstarted', points: 5 },
		{ title: 'Make loading spinner load faster', description: '', type: 'bug', state: 'unstarted', points: 1 },

		// Future release
		{ title: 'v2.0 - Now With More AI', description: '', type: 'release', state: 'unstarted' },

		// Icebox - the graveyard of dreams
		{ title: 'Rewrite in Rust', description: '', type: 'feature', state: 'unscheduled', points: 8 },
		{ title: 'Pretend to understand Kubernetes', description: '', type: 'chore', state: 'unscheduled' },
		{ title: 'Add AI to make investors happy', description: '', type: 'feature', state: 'unscheduled', points: 5 },
		{ title: 'Investigate haunted legacy code', description: '', type: 'bug', state: 'unscheduled', points: 3 },
		{ title: 'Figure out who Dave is and why he left so many TODOs', description: '', type: 'chore', state: 'unscheduled' },
		{ title: 'Explain to mom what I do', description: '', type: 'chore', state: 'unscheduled' },
		{ title: 'Deploy to production on Friday', description: '', type: 'feature', state: 'unscheduled', points: 1 },
		{ title: 'The feature marketing already announced', description: '', type: 'feature', state: 'unscheduled', points: 8 },
		{ title: 'Fix the bug that only happens in demos', description: '', type: 'bug', state: 'unscheduled', points: 3 },
		{ title: 'Ask why we have 3 date libraries', description: '', type: 'chore', state: 'unscheduled' },
	]

	const now = new Date().toISOString()
	const sqlStatements: string[] = []

	// Delete existing seed data first (project and stories only, not user)
	sqlStatements.push(`DELETE FROM Story WHERE projectId = ${toSQLValue(projectId)};`)
	sqlStatements.push(`DELETE FROM Project WHERE id = ${toSQLValue(projectId)};`)

	// Insert project using subquery to get userId by email
	sqlStatements.push(
		`INSERT INTO Project (id, name, userId, velocity, iterationLength, createdAt, updatedAt) VALUES (${toSQLValue(projectId)}, ${toSQLValue(projectName)}, (SELECT id FROM User WHERE email = ${toSQLValue(userEmail)}), 10, 7, ${toSQLValue(now)}, ${toSQLValue(now)});`,
	)

	// Insert stories with proper positions
	// Track positions separately for current (iteration=1) and icebox (iteration=null)
	let currentPosition = 0
	let iceboxPosition = 0

	stories.forEach((story, index) => {
		const storyId = `seed_story_${String(index + 1).padStart(3, '0')}`
		const storyNumber = index + 1

		// Determine iteration and position based on state
		let iteration: number | null
		let position: number

		if (story.state === 'unscheduled') {
			// Icebox
			iteration = null
			position = iceboxPosition++
		} else if (story.state === 'accepted') {
			// Done - these get iteration 1 but position doesn't matter much
			iteration = 1
			position = currentPosition++
		} else {
			// Current (unstarted, started, finished, delivered)
			iteration = 1
			position = currentPosition++
		}

		sqlStatements.push(
			`INSERT INTO Story (id, number, title, description, type, state, points, iteration, position, projectId, createdAt, updatedAt) VALUES (${toSQLValue(storyId)}, ${storyNumber}, ${toSQLValue(story.title)}, ${toSQLValue(story.description)}, ${toSQLValue(story.type)}, ${toSQLValue(story.state)}, ${toSQLValue(story.points)}, ${toSQLValue(iteration)}, ${toSQLValue(position)}, ${toSQLValue(projectId)}, ${toSQLValue(now)}, ${toSQLValue(now)});`,
		)
	})

	// Write to file
	const sqlContent = sqlStatements.join('\n')
	const outputPath = join(process.cwd(), 'scripts', 'seed-tracker.sql')
	writeFileSync(outputPath, sqlContent)

	console.log('✅ Seed SQL generated!')
	console.log(`\nGenerated:`)
	console.log(`  - 1 project (${projectName}) for user ${userEmail}`)
	console.log(`  - ${stories.length} stories`)
	console.log(`\nSQL file: ${outputPath}`)

	return outputPath
}

generateSeedSQL()
	.then(path => {
		console.log('\n🚀 Applying to local database...')
		try {
			execSync(`npx wrangler d1 execute leantracker --local --file=${path}`, {
				stdio: 'inherit',
				cwd: process.cwd(),
			})
			console.log('\n✨ Done! Seed data applied to local database.')
		} catch (error) {
			console.error('❌ Failed to apply seed:', error)
			process.exit(1)
		}
		process.exit(0)
	})
	.catch(error => {
		console.error('❌ Failed:', error)
		process.exit(1)
	})
