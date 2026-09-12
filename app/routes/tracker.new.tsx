import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from 'react-router'
import { Link, redirect, useFetcher } from 'react-router'
import { z } from 'zod'
import { RHFError } from '~/components/ErrorText'
import { GeneralErrorBoundary } from '~/components/GeneralErrorBoundary'
import { StatusButton } from '~/components/StatusButton'
import { TrackerHeader } from '~/components/tracker/TrackerHeader'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { getPrisma } from '~/utils/db.server'
import { deserialise, jsonToFormData } from '~/utils/deserialise'
import { requireUser } from '~/utils/session.server'
import { showToastOnError } from '~/utils/showToastOnError'

export const meta: MetaFunction = () => {
	return [{ title: 'Create project, opentracker' }, { name: 'description', content: 'Create a new project' }]
}

// Schema for backend validation (coerces strings to numbers)
const CreateProjectSchemaBackend = z.object({
	name: z.string().min(1, 'Project name is required'),
	velocity: z.coerce.number().min(1, 'Velocity must be at least 1').max(100, 'Velocity cannot exceed 100').default(10),
	iterationLength: z.coerce
		.number()
		.min(1, 'Iteration length must be at least 1')
		.max(30, 'Iteration length cannot exceed 30')
		.default(7),
})

// Schema for frontend validation (already typed as numbers from form)
const CreateProjectSchema = z.object({
	name: z.string().min(1, 'Project name is required'),
	velocity: z.number().min(1, 'Velocity must be at least 1').max(100, 'Velocity cannot exceed 100'),
	iterationLength: z.number().min(1, 'Iteration length must be at least 1').max(30, 'Iteration length cannot exceed 30'),
})
type CreateProjectSchema = z.infer<typeof CreateProjectSchema>

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
	await requireUser(request, context)
	return null
}

export const action = ({ request, context }: ActionFunctionArgs) =>
	showToastOnError(
		async () => {
			const user = await requireUser(request, context)
			const prisma = getPrisma({ context })

			const parsed = await deserialise(request, CreateProjectSchemaBackend)

			const project = await prisma.project.create({
				data: {
					name: parsed.name,
					userId: user.id,
					velocity: parsed.velocity,
					iterationLength: parsed.iterationLength,
				},
			})

			return redirect(`/tracker/${project.id}`)
		},
		request,
		context,
	)

export default function NewProject() {
	const fetcher = useFetcher()
	const [showAdvanced, setShowAdvanced] = useState(false)
	const {
		handleSubmit,
		register,
		formState: { errors },
	} = useForm<CreateProjectSchema>({
		resolver: zodResolver(CreateProjectSchema),
		defaultValues: {
			name: '',
			velocity: 10,
			iterationLength: 7,
		},
	})

	const onSubmit = (data: CreateProjectSchema) => {
		fetcher.submit(jsonToFormData(data), { method: 'post' })
	}

	return (
		<div className='min-h-screen flex flex-col bg-slate-950 text-slate-200'>
			<TrackerHeader />
			<main className='flex flex-1 items-start justify-center p-4 pt-12 md:pt-20'>
			<Card className='w-full max-w-md'>
				<CardHeader>
					<CardTitle>Create New Project</CardTitle>
					<CardDescription>Set up a new project to track your work</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
						<div className='space-y-2'>
							<Label htmlFor='name'>Project Name</Label>
							<Input
								id='name'
								{...register('name')}
								type='text'
								placeholder='My Awesome Project'
								autoFocus
								className='bg-slate-800 border-slate-700 text-slate-200'
							/>
							<RHFError errors={errors} name='name' />
						</div>

						{/* Advanced Settings Toggle */}
						<button
							type='button'
							onClick={() => setShowAdvanced(!showAdvanced)}
							className='flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300 transition-colors'
						>
							{showAdvanced ? <ChevronDown className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />}
							Advanced settings
						</button>

						{showAdvanced && (
							<div className='space-y-4 pl-5 border-l border-slate-700'>
								<div className='space-y-2'>
									<Label htmlFor='velocity'>Velocity (points per iteration)</Label>
									<p className='text-xs text-slate-400'>How many points your team can complete per iteration</p>
									<Input
										id='velocity'
										{...register('velocity', { valueAsNumber: true })}
										type='number'
										min='1'
										max='100'
										className='bg-slate-800 border-slate-700 text-slate-200'
									/>
									<RHFError errors={errors} name='velocity' />
								</div>

								<div className='space-y-2'>
									<Label htmlFor='iterationLength'>Iteration Length (days)</Label>
									<p className='text-xs text-slate-400'>Length of each iteration in days (e.g., 7 for weekly sprints)</p>
									<Input
										id='iterationLength'
										{...register('iterationLength', { valueAsNumber: true })}
										type='number'
										min='1'
										max='30'
										className='bg-slate-800 border-slate-700 text-slate-200'
									/>
									<RHFError errors={errors} name='iterationLength' />
								</div>
							</div>
						)}

						<div className='flex items-center justify-end gap-2 pt-4'>
							<Button type='button' variant='ghost' asChild className='text-slate-400 hover:text-slate-200'>
								<Link to='/tracker?list'>Cancel</Link>
							</Button>
							<StatusButton type='submit' status={fetcher.state}>
								<Plus className='h-4 w-4' />
								Create Project
							</StatusButton>
						</div>
					</form>
				</CardContent>
			</Card>
			</main>
		</div>
	)
}

export const ErrorBoundary = GeneralErrorBoundary
