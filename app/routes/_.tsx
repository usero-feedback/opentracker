import { NavigationMenu, NavigationMenuItem } from '@radix-ui/react-navigation-menu'
import { Menu, User } from 'lucide-react'
import { useEffect } from 'react'
import type { LoaderFunctionArgs } from 'react-router'
import { data, Link, MetaFunction, NavLink, Outlet, useLoaderData, useRouteLoaderData } from 'react-router'
import { Wordmark } from '~/components/Wordmark'
import { GeneralErrorBoundary } from '~/components/GeneralErrorBoundary'
import { Button } from '~/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '~/components/ui/sheet'
import { ToastAction, type ToastActionElement } from '~/components/ui/toast'
import { useToast } from '~/hooks/use-toast'
import { cn } from '~/lib/utils'
import { routes } from '~/utils/routes'
import { createStorage, getSessionToast, getUserFromSession, getUserSession } from '~/utils/session.server'
import { isNullOrUndefined } from '~/utils/typecheck'

export const meta: MetaFunction = () => {
	return [
		{ title: 'opentracker, the story board your coding agents work from' },
		{
			name: 'description',
			content:
				'An open source Pivotal Tracker style board with an MCP server. Agents pick up stories and mark them finished; you accept or reject.',
		},
		{ name: 'theme-color', content: '#0a0a0b' },
		{ name: 'apple-mobile-web-app-capable', content: 'yes' },
		{ name: 'apple-mobile-web-app-status-bar-style', content: 'black' },
		{ name: 'apple-mobile-web-app-title', content: 'opentracker' },
		{ name: 'mobile-web-app-capable', content: 'yes' },
		{ property: 'og:site_name', content: 'opentracker' },
		{ property: 'og:title', content: 'opentracker, the story board your coding agents work from' },
		{
			property: 'og:description',
			content:
				'An open source Pivotal Tracker style board with an MCP server. Agents pick up stories and mark them finished; you accept or reject.',
		},
		{ property: 'og:url', content: 'https://tracker.usero.io' },
		{ property: 'og:type', content: 'website' },
		{ property: 'og:image', content: 'https://tracker.usero.io/imgs/both-devices-without-background.png' },
		{ property: 'og:image:width', content: '2000' },
		{ property: 'og:image:height', content: '901' },
		{ property: 'og:image:alt', content: 'opentracker board with icebox, backlog and current iteration' },
	]
}

export type WrapperLoaderData = {
	user: { id: string; email: string } | null
	toast: Awaited<ReturnType<typeof getSessionToast>>
}

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
	const session = await getUserSession(request, context)
	const [sessionUser, toast] = await Promise.all([getUserFromSession(session), getSessionToast(session)])

	const loaderData: WrapperLoaderData = {
		user: isNullOrUndefined(sessionUser) ? null : { id: sessionUser.id, email: sessionUser.email },
		toast,
	}

	let headers: HeadersInit = {}
	if (toast) {
		headers = { 'Set-Cookie': await createStorage(context).commitSession(session) }
	}

	return data(loaderData, { headers })
}

export function useWrapperLoaderData() {
	const data = useRouteLoaderData<WrapperLoaderData>('routes/_')
	return data!
}

export default function Component() {
	const data = useLoaderData<typeof loader>()
	const { toast: showToast } = useToast()

	useEffect(() => {
		const toast = data.toast
		if (toast) {
			let action: ToastActionElement | undefined = undefined
			if (toast.linkAction) {
				action = (
					<ToastAction altText={toast.linkAction.label} asChild>
						<Link to={toast.linkAction.href}>{toast.linkAction.label}</Link>
					</ToastAction>
				)
			}

			const toastConfig = {
				...toast,
				action,
			}
			// otherwise it's not shown if this is the first render
			setTimeout(() => showToast(toastConfig), 50)
		}
	}, [data.toast, showToast])

	const isLoggedIn = !isNullOrUndefined(data.user)

	return (
		<div className='flex flex-col min-h-screen bg-[#0a0a0b] text-white overflow-x-hidden'>
			<header className='w-full  mx-auto px-4 py-4 md:px-6'>
				{/* Desktop Navigation */}
				<NavigationMenu className='hidden md:flex'>
					<ul className='flex flex-grow flex-row items-center gap-4'>
						<NavigationMenuItem>
							<Link to={isLoggedIn ? '/tracker' : routes.home} prefetch='intent'>
								<Wordmark className='text-xl' />
							</Link>
						</NavigationMenuItem>
						<NavigationMenuItem className='flex-grow' />
						{isLoggedIn ? (
							<>
								<NavigationMenuItem>
									<NavLink
										to='/tracker'
										prefetch='intent'
										className={({ isActive }) =>
											cn('text-sm transition-colors', isActive ? 'text-white' : 'text-white/60 hover:text-white')
										}
									>
										Tracker
									</NavLink>
								</NavigationMenuItem>
								<NavigationMenuItem>
									<NavLink
										to={routes.userProfile}
										prefetch='intent'
										title='Profile'
										className={({ isActive }) =>
											cn(
												'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
												isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5',
											)
										}
									>
										<User className='h-4 w-4' />
									</NavLink>
								</NavigationMenuItem>
							</>
						) : (
							<>
								<NavigationMenuItem>
									<NavLink to='/login' prefetch='intent' className='text-white/60 hover:text-white transition-colors text-sm'>
										Log in
									</NavLink>
								</NavigationMenuItem>
								<NavigationMenuItem>
									<Link to='/signup'>
										<Button size='sm' className='bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded-lg'>
											Get started
										</Button>
									</Link>
								</NavigationMenuItem>
							</>
						)}
					</ul>
				</NavigationMenu>

				{/* Mobile Navigation */}
				<div className='flex md:hidden items-center justify-between w-full'>
					<Link to={isLoggedIn ? '/tracker' : routes.home} prefetch='intent'>
						<Wordmark className='text-lg' />
					</Link>
					{isLoggedIn ? (
						<Sheet>
							<SheetTrigger asChild>
								<button className='p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors'>
									<Menu className='h-5 w-5' />
									<span className='sr-only'>Open menu</span>
								</button>
							</SheetTrigger>
							<SheetContent side='right' className='bg-[#0a0a0b] border-white/10'>
								<nav className='flex flex-col gap-2 mt-8'>
									<SheetClose asChild>
										<NavLink
											to='/tracker'
											prefetch='intent'
											className={({ isActive }) =>
												cn(
													'rounded-lg px-4 py-3 text-sm font-medium transition-colors',
													isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5',
												)
											}
										>
											Tracker
										</NavLink>
									</SheetClose>
									<SheetClose asChild>
										<NavLink
											to={routes.userProfile}
											prefetch='intent'
											className={({ isActive }) =>
												cn(
													'rounded-lg px-4 py-3 text-sm font-medium transition-colors',
													isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5',
												)
											}
										>
											Profile
										</NavLink>
									</SheetClose>
									<SheetClose asChild>
										<NavLink
											to='/logout'
											prefetch='intent'
											className='rounded-lg px-4 py-3 text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors'
										>
											Logout
										</NavLink>
									</SheetClose>
								</nav>
							</SheetContent>
						</Sheet>
					) : (
						<div className='flex items-center gap-4'>
							<Link to='/login' className='text-white/60 hover:text-white transition-colors text-sm'>
								Log in
							</Link>
							<Link to='/signup'>
								<Button size='sm' className='bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg'>
									Get started
								</Button>
							</Link>
						</div>
					)}
				</div>
			</header>
			<div className='flex-grow pb-20 md:pb-0'>
				<Outlet />
			</div>
			{data.user && (
				<nav className='fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0a0a0b]/95 backdrop-blur-sm border-t border-white/10'>
					<div className='flex items-center justify-around h-18 pb-safe'>
						<NavLink
							to='/tracker'
							aria-label='Tracker'
							className={({ isActive }) =>
								cn(
									'flex flex-col items-center justify-center gap-1 flex-1 py-2 text-white/50 transition-colors rounded-lg',
									isActive && 'text-white bg-white/5',
								)
							}
						>
							<Menu className='h-5 w-5' />
							<span className='text-xs'>Tracker</span>
						</NavLink>
						<NavLink
							to={routes.userProfile}
							aria-label='Profile'
							className={({ isActive }) =>
								cn(
									'flex flex-col items-center justify-center gap-1 flex-1 py-2 text-white/50 transition-colors rounded-lg',
									isActive && 'text-white bg-white/5',
								)
							}
						>
							<User className='h-5 w-5' />
							<span className='text-xs'>Profile</span>
						</NavLink>
					</div>
				</nav>
			)}
		</div>
	)
}

export const ErrorBoundary = GeneralErrorBoundary
