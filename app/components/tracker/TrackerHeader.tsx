import { LogOut, User } from 'lucide-react'
import { Link, NavLink, useFetcher } from 'react-router'
import { Wordmark } from '~/components/Wordmark'
import { cn } from '~/lib/utils'
import { routes } from '~/utils/routes'

const iconLink =
	'inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-500'

// Slim top bar for the tracker pages that have no board sidebar (project list, new project)
export function TrackerHeader() {
	const logoutFetcher = useFetcher()

	return (
		<header className='border-b border-slate-800 bg-slate-950'>
			<div className='mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-8'>
				<Link to='/tracker?list' prefetch='intent' className='rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-500'>
					<Wordmark className='text-lg' />
				</Link>
				<nav className='flex items-center gap-1'>
					<NavLink
						to={routes.userProfile}
						prefetch='intent'
						className={({ isActive }) => cn(iconLink, isActive && 'bg-slate-800 text-slate-100')}
					>
						<User className='h-4 w-4' />
						<span className='hidden sm:inline'>Profile</span>
					</NavLink>
					<button
						type='button'
						onClick={() => logoutFetcher.submit({}, { action: '/logout', method: 'post' })}
						disabled={logoutFetcher.state !== 'idle'}
						className={cn(iconLink, 'disabled:opacity-60')}
					>
						<LogOut className='h-4 w-4' />
						<span className='hidden sm:inline'>Log out</span>
					</button>
				</nav>
			</div>
		</header>
	)
}
