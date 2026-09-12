import type { LoaderFunctionArgs } from 'react-router'
import { data } from 'react-router'
import { requireApiUser } from '~/utils/api-auth.server'
import { getPrisma } from '~/utils/db.server'

interface ProjectInfo {
	id: string
	name: string
}

interface GetProjectsResponse {
	projects: ProjectInfo[]
}

export async function loader({ request, context }: LoaderFunctionArgs) {
	try {
		// Authenticate using API key
		const apiUser = await requireApiUser(request, context)

		const prisma = getPrisma({ context })

		// Get all projects for this user
		const projects = await prisma.project.findMany({
			where: {
				userId: apiUser.id,
			},
			select: {
				id: true,
				name: true,
			},
			orderBy: {
				createdAt: 'desc',
			},
		})

		const response: GetProjectsResponse = {
			projects: projects.map(p => ({
				id: p.id,
				name: p.name,
			})),
		}

		return data(response, {
			headers: {
				'Content-Type': 'application/json',
			},
		})
	} catch (error) {
		// 401/429 from the auth helper are already the intended response.
		if (error instanceof Response) throw error
		// Handle errors
		console.error('Error fetching projects:', error)
		return data(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			{ status: 500 },
		)
	}
}
