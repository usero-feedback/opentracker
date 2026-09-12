import { Plus, Search } from 'lucide-react'
import { useState, useMemo } from 'react'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { data, Link, redirect, useLoaderData } from 'react-router'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { getPrisma } from '~/utils/db.server'
import { requireUser } from '~/utils/session.server'

export const meta: MetaFunction = () => {
	return [{ title: 'Projects, opentracker' }, { name: 'description', content: 'View and manage your projects' }]
}

function formatRelativeTime(date: Date): string {
	const now = new Date()
	const diffInMs = now.getTime() - date.getTime()
	const diffInSeconds = Math.floor(diffInMs / 1000)
	const diffInMinutes = Math.floor(diffInSeconds / 60)
	const diffInHours = Math.floor(diffInMinutes / 60)
	const diffInDays = Math.floor(diffInHours / 24)

	if (diffInDays > 365) {
		const years = Math.floor(diffInDays / 365)
		return `${years} ${years === 1 ? 'year' : 'years'} ago`
	}
	if (diffInDays > 30) {
		const months = Math.floor(diffInDays / 30)
		return `${months} ${months === 1 ? 'month' : 'months'} ago`
	}
	if (diffInDays > 0) {
		return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`
	}
	if (diffInHours > 0) {
		return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`
	}
	if (diffInMinutes > 0) {
		return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`
	}
	return 'just now'
}

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
	const user = await requireUser(request, context)
	const prisma = getPrisma({ context })

	const projects = await prisma.project.findMany({
		where: { userId: user.id },
		orderBy: { updatedAt: 'desc' },
		select: {
			id: true,
			name: true,
			velocity: true,
			iterationLength: true,
			createdAt: true,
			updatedAt: true,
			_count: {
				select: {
					stories: true,
				},
			},
		},
	})

	// Straight to the board when there is only one project, unless the list was asked for (?list)
	const wantsList = new URL(request.url).searchParams.has('list')
	if (projects.length === 1 && !wantsList) {
		return redirect(`/tracker/${projects[0].id}`)
	}

	return data({ projects })
}

type ProjectGroup = 'recent' | 'thisMonth' | 'older'

function groupProjectsByRecency(projects: Array<{ updatedAt: Date }>): Map<ProjectGroup, number[]> {
	const now = new Date()
	const groups = new Map<ProjectGroup, number[]>([
		['recent', []],
		['thisMonth', []],
		['older', []],
	])

	projects.forEach((project, index) => {
		const updatedAt = new Date(project.updatedAt)
		const diffInMs = now.getTime() - updatedAt.getTime()
		const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

		if (diffInDays <= 7) {
			groups.get('recent')?.push(index)
		} else if (diffInDays <= 30) {
			groups.get('thisMonth')?.push(index)
		} else {
			groups.get('older')?.push(index)
		}
	})

	return groups
}

export default function TrackerIndex() {
	const { projects } = useLoaderData<typeof loader>()
	const [searchTerm, setSearchTerm] = useState('')

	const filteredProjects = useMemo(() => {
		if (!searchTerm.trim()) {
			return projects
		}
		return projects.filter(project => project.name.toLowerCase().includes(searchTerm.toLowerCase()))
	}, [projects, searchTerm])

	const groupedProjectIndices = useMemo(() => {
		return groupProjectsByRecency(filteredProjects)
	}, [filteredProjects])

	if (projects.length === 0) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-slate-950 text-slate-200'>
				<Card className='w-full max-w-md mx-4'>
					<CardHeader>
						<CardTitle>Welcome to Tracker</CardTitle>
						<CardDescription>You don't have any projects yet. Create your first project to get started.</CardDescription>
					</CardHeader>
					<CardContent>
						<Button className='w-full' asChild>
							<Link to='/tracker/new'>
								<Plus className='mr-2 h-4 w-4' />
								Create Project
							</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	const renderProjectGroup = (groupName: string, projectIndices: number[]) => {
		if (projectIndices.length === 0) {
			return null
		}

		return (
			<div key={groupName} className='mb-8'>
				<h2 className='text-xl font-semibold mb-4 text-slate-300'>{groupName}</h2>
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
					{projectIndices.map(index => {
						const project = filteredProjects[index]
						return (
							<Link key={project.id} to={`/tracker/${project.id}`} className='block'>
								<Card className='hover:border-slate-600 transition-colors cursor-pointer h-full'>
									<CardHeader>
										<CardTitle className='text-lg'>{project.name}</CardTitle>
										<CardDescription>
											{project._count.stories} {project._count.stories === 1 ? 'story' : 'stories'}
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className='text-sm text-slate-400 space-y-1'>
											<div>Velocity: {project.velocity} points</div>
											<div>Iteration: {project.iterationLength} days</div>
											<div className='text-slate-500 text-xs mt-2'>Updated {formatRelativeTime(new Date(project.updatedAt))}</div>
										</div>
									</CardContent>
								</Card>
							</Link>
						)
					})}
				</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-slate-950 text-slate-200 p-8'>
			<div className='max-w-6xl mx-auto'>
				<div className='flex items-center justify-between mb-8'>
					<div>
						<h1 className='text-3xl font-bold mb-2'>Your Projects</h1>
						<p className='text-slate-400'>Select a project to work on</p>
					</div>
					<Button variant='default' size='lg' asChild className='bg-blue-600 hover:bg-blue-700'>
						<Link to='/tracker/new'>
							<Plus className='mr-2 h-4 w-4' />
							New Project
						</Link>
					</Button>
				</div>

				<div className='mb-6'>
					<div className='relative max-w-md'>
						<Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400' />
						<Input
							type='text'
							placeholder='Search projects...'
							value={searchTerm}
							onChange={e => setSearchTerm(e.target.value)}
							className='pl-10 bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500'
						/>
					</div>
				</div>

				{filteredProjects.length === 0 ? (
					<div className='text-center py-12'>
						<p className='text-slate-400'>No projects found matching "{searchTerm}"</p>
					</div>
				) : (
					<>
						{renderProjectGroup('Recent', groupedProjectIndices.get('recent') ?? [])}
						{renderProjectGroup('This Month', groupedProjectIndices.get('thisMonth') ?? [])}
						{renderProjectGroup('Older', groupedProjectIndices.get('older') ?? [])}
					</>
				)}
			</div>
		</div>
	)
}
