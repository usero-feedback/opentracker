import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from 'react-router'
import { redirect, useFetcher, useLoaderData, useSearchParams } from 'react-router'
import { z } from 'zod'
import { ApiKeysSection } from '~/components/ApiKeysSection'
import { RHFError } from '~/components/ErrorText'
import { GeneralErrorBoundary } from '~/components/GeneralErrorBoundary'
import { StatusButton } from '~/components/StatusButton'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { passwordService } from '~/backend/passwordService'
import { EmailSchema, PasswordSchema } from '~/types'
import { apiKeyStorageFields, generateApiKey } from '~/utils/api-auth.server'
import { getPrisma } from '~/utils/db.server'
import { deserialise, jsonToFormData } from '~/utils/deserialise'
import { createUserSessionAndRedirect, requireUser } from '~/utils/session.server'
import { showToastOnError } from '~/utils/showToastOnError'

export const meta: MetaFunction = () => {
	return [{ title: 'Profile, opentracker' }, { name: 'description', content: 'Manage your profile settings' }]
}

const ProfileUpdateSchema = z.object({
	email: EmailSchema,
	currentPassword: z.string().min(1, 'Current password is required'),
	newPassword: PasswordSchema.optional(),
})
type ProfileUpdateSchema = z.infer<typeof ProfileUpdateSchema>

const ActionSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('updateProfile'),
		email: EmailSchema,
		currentPassword: z.string().min(1, 'Current password is required'),
		newPassword: PasswordSchema.optional(),
	}),
	z.object({
		type: z.literal('createApiKey'),
		name: z.string().trim().min(1, 'Name is required').max(60),
	}),
	z.object({
		type: z.literal('revokeApiKey'),
		id: z.string().min(1),
	}),
])

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
	const user = await requireUser(request, context)
	const prisma = getPrisma({ context })

	const dbUser = await prisma.user.findUnique({
		where: { id: user.id },
		select: {
			id: true,
			email: true,
			createdAt: true,
			apiKeys: {
				select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
				orderBy: { createdAt: 'desc' },
			},
		},
	})

	if (!dbUser) {
		throw new Response(`User not found in database (id=${user.id})`, { status: 404 })
	}

	return {
		user: {
			id: dbUser.id,
			email: dbUser.email,
			createdAt: dbUser.createdAt.toISOString(),
		},
		apiKeys: dbUser.apiKeys.map(k => ({
			id: k.id,
			name: k.name,
			prefix: k.prefix,
			lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
			createdAt: k.createdAt.toISOString(),
		})),
	}
}

export const action = ({ request, context }: ActionFunctionArgs) =>
	showToastOnError(
		async () => {
			const user = await requireUser(request, context)
			const prisma = getPrisma({ context })

			const parsed = await deserialise(request, ActionSchema)

			if (parsed.type === 'createApiKey') {
				const newApiKey = generateApiKey()
				await prisma.apiKey.create({
					data: { userId: user.id, name: parsed.name, ...(await apiKeyStorageFields(newApiKey)) },
				})
				// Plaintext goes back in the action response only; it is never stored.
				return { success: true, newApiKey, newApiKeyName: parsed.name }
			} else if (parsed.type === 'revokeApiKey') {
				// userId in the where so a user can only revoke their own keys.
				await prisma.apiKey.deleteMany({ where: { id: parsed.id, userId: user.id } })
				return { success: true }
			} else if (parsed.type === 'updateProfile') {
				const existingUser = await prisma.user.findUnique({
					where: { id: user.id },
				})

				if (!existingUser) {
					throw new Error('User not found')
				}

				const isCorrectPassword = await passwordService.verifyPassword(existingUser.password, parsed.currentPassword)
				if (!isCorrectPassword) {
					throw new Error('Current password is incorrect')
				}

				const password = parsed.newPassword ? await passwordService.hashPassword(parsed.newPassword) : undefined
				const updated = await prisma.user.update({
					where: { id: user.id },
					data: { email: parsed.email, password },
				})

				// The session cookie carries the email, so refresh it after a change.
				return createUserSessionAndRedirect({ id: updated.id, email: updated.email }, context, '/profile?updated=true', request)
			}

			return redirect('/profile')
		},
		request,
		context,
	)

export default function ProfilePage() {
	const { user, apiKeys } = useLoaderData<typeof loader>()
	const [searchParams] = useSearchParams()
	const fetcher = useFetcher()
	const logoutFetcher = useFetcher()

	const {
		handleSubmit,
		register,
		formState: { errors },
	} = useForm<ProfileUpdateSchema>({
		resolver: zodResolver(ProfileUpdateSchema),
		defaultValues: {
			email: user.email,
			currentPassword: '',
			newPassword: '',
		},
	})

	const onSubmit = (data: ProfileUpdateSchema) => {
		fetcher.submit(jsonToFormData({ type: 'updateProfile', ...data }), { method: 'post' })
	}

	return (
		<div className='container max-w-2xl mx-auto flex flex-col gap-6  px-4'>
			<div>
				<h1 className='text-3xl font-bold'>Profile Settings</h1>
				<p className='text-muted-foreground'>Manage your account settings and preferences</p>
			</div>

			{/* Success Message */}
			{searchParams.get('updated') === 'true' && (
				<Card className='border-green-500'>
					<CardContent className='pt-6'>
						<p className='text-sm text-green-600'>Profile updated successfully!</p>
					</CardContent>
				</Card>
			)}

			<ApiKeysSection apiKeys={apiKeys} />

			{/* Profile Form */}
			<Card>
				<CardHeader>
					<CardTitle>Account Information</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
						<div className='space-y-2'>
							<Label htmlFor='email'>Email Address</Label>
							<Input id='email' {...register('email')} type='email' />
							<RHFError errors={errors} name='email' />
						</div>

						<details className='group border rounded-lg p-4'>
							<summary className='cursor-pointer list-none font-medium flex items-center justify-between'>
								<span>Change Password</span>
								<span className='text-xs text-muted-foreground'>(optional)</span>
							</summary>
							<div className='mt-4 space-y-4'>
								<div className='space-y-2'>
									<Label htmlFor='currentPassword'>Current Password</Label>
									<Input id='currentPassword' {...register('currentPassword')} type='password' />
									<RHFError errors={errors} name='currentPassword' />
								</div>

								<div className='space-y-2'>
									<Label htmlFor='newPassword'>New Password</Label>
									<Input id='newPassword' {...register('newPassword')} type='password' placeholder='Enter new password' />
									<RHFError errors={errors} name='newPassword' />
								</div>
							</div>
						</details>

						<StatusButton type='submit' status={fetcher.state}>
							Update Profile
						</StatusButton>
					</form>
				</CardContent>
			</Card>

			{/* Account Meta */}
			<Card>
				<CardHeader>
					<CardTitle>Account Details</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='space-y-2 text-sm'>
						<div className='flex justify-between'>
							<span className='text-muted-foreground'>Account ID:</span>
							<span className='font-mono'>{user.id}</span>
						</div>
						<div className='flex justify-between'>
							<span className='text-muted-foreground'>Member since:</span>
							<span>{new Date(user.createdAt).toLocaleDateString()}</span>
						</div>
						<Button onClick={() => logoutFetcher.submit({}, { action: '/logout', method: 'post' })}>Log out</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export const ErrorBoundary = GeneralErrorBoundary
