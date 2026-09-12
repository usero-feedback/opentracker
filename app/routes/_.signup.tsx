import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
	Link,
	LoaderFunctionArgs,
	MetaDescriptor,
	useFetcher,
	redirect,
	useSearchParams,
	type ActionFunctionArgs,
	type MetaFunction,
} from 'react-router'
import { z } from 'zod'
import { passwordService } from '~/backend/passwordService'
import { RHFError } from '~/components/ErrorText'
import { GeneralErrorBoundary } from '~/components/GeneralErrorBoundary'
import { StatusButton } from '~/components/StatusButton'
import { Input } from '~/components/ui/input'
import { useToast } from '~/hooks/use-toast'
import { EmailSchema, getRedirectToFromSearchParams, PasswordSchema } from '~/types'
import { trackServerEvent } from '~/utils/events.server'
import { getPrisma } from '~/utils/db.server'
import { deserialise, jsonToFormData } from '~/utils/deserialise'
import { authRateLimitResponse } from '~/utils/rateLimit.server'
import { canonicalMetadata } from '~/utils/metadata'
import { routes } from '~/utils/routes'
import { createUserSessionAndRedirect, getRedirectToFromRequest } from '~/utils/session.server'
import { showToastOnError } from '~/utils/showToastOnError'
import { isNullOrUndefined } from '~/utils/typecheck'

const SubmitAuthRequest = z.object({
	email: EmailSchema,
	password: PasswordSchema,
	// Honeypot: hidden from people, filled in by bots.
	website: z.string().optional(),
})
type SubmitAuthRequest = z.infer<typeof SubmitAuthRequest>

export const loader = ({ request }: LoaderFunctionArgs) => {
	return { meta: canonicalMetadata(request) }
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => {
	const meta = loaderData?.meta
	const data: MetaDescriptor[] = [
		{ title: 'Sign up, opentracker' },
		{
			name: 'description',
			content: 'Create a free opentracker account. The story board your coding agents work from.',
		},
	]
	if (meta) data.push(meta)
	return data
}

export const action = async ({ request, context }: ActionFunctionArgs) => {
	const limited = await authRateLimitResponse(request, context, 'signup')
	if (limited) return limited
	return showToastOnError(
		async () => {
			const prisma = getPrisma({ context })
			const redirectTo = getRedirectToFromRequest(request)

			const parsed = await deserialise(request, SubmitAuthRequest)
			if (parsed.website) return redirect(redirectTo)
			const existingUser = await prisma.user.findUnique({
				where: { email: parsed.email },
			})
			if (!isNullOrUndefined(existingUser)) {
				throw new Error(`Email already registered`)
			}
			const hashedPassword = await passwordService.hashPassword(parsed.password)
			const newUser = await prisma.user.create({
				data: {
					password: hashedPassword,
					email: parsed.email,
				},
			})

			// Track signup event (non-blocking, uses waitUntil)
			trackServerEvent('sign_up', { method: 'email', email: newUser.email }, request, context)

			return createUserSessionAndRedirect({ id: newUser.id, email: newUser.email }, context, redirectTo, request)
		},
		request,
		context,
	)
}

export default function Component() {
	const fetcher = useFetcher()
	const { toast } = useToast()
	const [searchParams] = useSearchParams()
	const redirectTo = getRedirectToFromSearchParams(searchParams)
	const [showPassword, setShowPassword] = useState(false)

	const onSubmit = async (data: SubmitAuthRequest) => {
		fetcher.submit(jsonToFormData(data), {
			method: 'post',
		})
	}

	const {
		handleSubmit,
		register,
		formState: { errors },
	} = useForm<SubmitAuthRequest>({
		resolver: zodResolver(SubmitAuthRequest),
		defaultValues: {},
	})

	return (
		<div className='container flex flex-col justify-center pb-32 pt-20 mx-auto  px-4'>
			<div className='text-center'>
				<h1 className='text-h1'>Sign up</h1>
			</div>
			<div className='mx-auto mt-8 min-w-full max-w-sm sm:min-w-[368px]'>
				<form onSubmit={handleSubmit(onSubmit)}>
					<div>
						<Input {...register('email')} placeholder='Email' type='email' autoFocus />
						<RHFError errors={errors} name='email' />
					</div>
					<div>
						<div className='relative'>
							<Input {...register('password')} placeholder='Password' type={showPassword ? 'text' : 'password'} />
							<button
								type='button'
								onClick={() => setShowPassword(!showPassword)}
								className='absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700'
								aria-label={showPassword ? 'Hide password' : 'Show password'}
							>
								{showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
							</button>
						</div>
						<RHFError errors={errors} name='password' />
					</div>
					<div className='absolute -left-[9999px]' aria-hidden='true'>
						<input {...register('website')} type='text' tabIndex={-1} autoComplete='off' />
					</div>
					<StatusButton className='w-full' status={fetcher.state} type='submit'>
						Create Account
					</StatusButton>
				</form>
				<p className='mt-4 text-center text-sm'>
					Already have an account?{' '}
					<Link to={`${routes.login}?redirectTo=${encodeURIComponent(redirectTo ?? '/')}`} className='underline'>
						Login
					</Link>
				</p>
				<div className='mt-8 text-center'>
					<p className='text-sm text-gray-400 max-w-md mx-auto leading-relaxed'>
						A free, open source story board your coding agents work from, with an MCP server built in.
					</p>
				</div>
			</div>
		</div>
	)
}

export const ErrorBoundary = GeneralErrorBoundary
