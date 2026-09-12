import { Link } from 'react-router'
import { Wordmark } from '~/components/Wordmark'
import { Button } from '~/components/ui/button'

const GITHUB_URL = 'https://github.com/usero-feedback/opentracker'

export function LandingPage() {
	return (
		<div className='min-h-screen bg-[#0a0a0b] text-white'>
			{/* Hero */}
			<section className='px-6 pt-10 pb-20 md:pt-16'>
				<div className='max-w-5xl mx-auto'>
					<h1 className='text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] max-w-3xl text-white/95'>
						The story board your coding agents work from.
					</h1>
					<p className='mt-6 max-w-2xl text-lg md:text-xl text-white/55 leading-relaxed'>
						A Pivotal Tracker style board with an MCP server. An agent picks up a story, marks it started, does the work and marks
						it finished. You accept or reject.
					</p>

					<div className='mt-8 flex flex-wrap items-center gap-x-6 gap-y-3'>
						<Link to='/signup'>
							<Button
								size='lg'
								className='bg-amber-400 hover:bg-amber-300 text-black font-semibold px-7 h-12 text-base rounded-lg'
							>
								Create a free board
							</Button>
						</Link>
						<a
							href={GITHUB_URL}
							target='_blank'
							rel='noreferrer'
							className='inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-base'
						>
							<GithubMark className='h-4 w-4' />
							Open source, MIT
						</a>
					</div>

					{/* Product screenshot */}
					<div className='mt-14 rounded-xl border border-white/10 bg-[#111113] overflow-hidden shadow-2xl'>
						<div className='flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-[#0d0d0e]'>
							<div className='flex gap-1.5'>
								<span className='w-2.5 h-2.5 rounded-full bg-white/10' />
								<span className='w-2.5 h-2.5 rounded-full bg-white/10' />
								<span className='w-2.5 h-2.5 rounded-full bg-white/10' />
							</div>
							<div className='flex-1 flex justify-center'>
								<span className='px-3 py-0.5 rounded bg-white/5 text-white/30 text-xs font-mono'>tracker.usero.io</span>
							</div>
						</div>
						<img
							src='/imgs/opentracker-screenshot.jpg'
							alt='opentracker board showing the current iteration and the icebox'
							className='w-full'
						/>
					</div>
				</div>
			</section>

			{/* How a story moves */}
			<section className='px-6 py-20 border-t border-white/5'>
				<div className='max-w-5xl mx-auto grid md:grid-cols-[1fr_1.4fr] gap-10 md:gap-16 items-start'>
					<div className='min-w-0'>
						<h2 className='text-2xl md:text-3xl font-semibold tracking-tight text-white/90'>How a story moves</h2>
						<p className='mt-4 text-white/55 leading-relaxed'>
							The agent does the first two steps over MCP. The last one is yours. A rejection drops the story back into the
							current iteration with its comment thread intact, so the next attempt starts from your review notes.
						</p>
						<p className='mt-4 text-white/55 leading-relaxed'>
							Stories are pointed 1, 2, 4 or 8 and iterations fill up to a velocity. In practice that number is how much agent
							output you can review in a week.
						</p>
					</div>

					<ol className='min-w-0 rounded-xl border border-white/10 bg-[#111113] divide-y divide-white/5 font-mono text-sm'>
						<LifecycleRow who='agent' state='started' action={<StateChip tone='blue'>Start</StateChip>}>
							Picks the top unstarted story
						</LifecycleRow>
						<LifecycleRow who='agent' state='finished' action={<StateChip tone='blue'>Finish</StateChip>}>
							Does the work, leaves notes and a PR link
						</LifecycleRow>
						<LifecycleRow
							who='you'
							state='accepted or rejected'
							action={
								<span className='flex flex-col sm:flex-row gap-1.5'>
									<StateChip tone='green'>Accept</StateChip>
									<StateChip tone='red'>Reject</StateChip>
								</span>
							}
						>
							Review it on the board
						</LifecycleRow>
					</ol>
				</div>
			</section>

			{/* Connect an agent */}
			<section className='px-6 py-20 border-t border-white/5'>
				<div className='max-w-5xl mx-auto'>
					<h2 className='text-2xl md:text-3xl font-semibold tracking-tight text-white/90'>Connect an agent</h2>
					<p className='mt-4 max-w-2xl text-white/55 leading-relaxed'>
						Create an API key on your profile page, then add the MCP server. Any client that speaks streamable HTTP works the same
						way: Claude Code, Cursor, OpenCode.
					</p>
					<pre className='mt-6 rounded-lg border border-white/10 bg-[#111113] px-5 py-4 text-sm font-mono text-white/80 overflow-x-auto'>
						<code>
							<span className='text-white/35'>$ </span>claude mcp add --transport http tracker https://tracker.usero.io/mcp
							--header {'"'}Authorization: Bearer lt_...{'"'}
						</code>
					</pre>
					<p className='mt-5 max-w-2xl text-white/45 text-sm leading-relaxed'>
						Seven tools: <Mono>list_projects</Mono>, <Mono>list_stories</Mono>, <Mono>get_story</Mono>, <Mono>create_story</Mono>,{' '}
						<Mono>update_story</Mono>, <Mono>add_comment</Mono> and <Mono>list_labels</Mono>. There is a REST API too.
					</p>
				</div>
			</section>

			{/* Open source */}
			<section className='px-6 py-20 border-t border-white/5'>
				<div className='max-w-5xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16'>
					<div className='min-w-0'>
						<h2 className='text-2xl md:text-3xl font-semibold tracking-tight text-white/90'>Run it yourself, or here</h2>
						<p className='mt-4 text-white/55 leading-relaxed'>
							opentracker is MIT licensed. It runs on Cloudflare Workers with a D1 database and the free tier is enough. The
							hosted version on this site is free as well, and it is the one I use every day with my own agents.
						</p>
					</div>
					<div className='flex flex-col gap-3 md:pt-2'>
						<a
							href={GITHUB_URL}
							target='_blank'
							rel='noreferrer'
							className='group flex items-center justify-between rounded-lg border border-white/10 px-5 py-4 hover:border-white/25 transition-colors'
						>
							<span className='flex items-center gap-3'>
								<GithubMark className='h-5 w-5 text-white/70' />
								<span className='text-white/85'>usero-feedback/opentracker</span>
							</span>
							<span className='text-white/35 text-sm group-hover:text-white/60 transition-colors'>Source</span>
						</a>
						<Link
							to='/signup'
							className='group flex items-center justify-between rounded-lg border border-amber-400/40 bg-amber-400/5 px-5 py-4 hover:border-amber-400 transition-colors'
						>
							<span className='text-white/85'>tracker.usero.io</span>
							<span className='text-amber-300 text-sm'>Create a free board</span>
						</Link>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className='px-6 py-12 border-t border-white/5'>
				<div className='max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6'>
					<Link to='/' className='flex items-center'>
						<Wordmark className='text-base' />
					</Link>
					<div className='flex items-center gap-8 text-sm text-white/40'>
						<a href={GITHUB_URL} target='_blank' rel='noreferrer' className='hover:text-white/70 transition-colors'>
							GitHub
						</a>
						<Link to='/login' className='hover:text-white/70 transition-colors'>
							Log in
						</Link>
						<Link to='/signup' className='hover:text-white/70 transition-colors'>
							Sign up
						</Link>
					</div>
					<p className='text-sm text-white/30'>© {new Date().getFullYear()} opentracker</p>
				</div>
			</footer>
		</div>
	)
}

function LifecycleRow({
	who,
	state,
	action,
	children,
}: {
	who: 'agent' | 'you'
	state: string
	action: React.ReactNode
	children: React.ReactNode
}) {
	return (
		<li className='flex items-center gap-3 sm:gap-4 px-4 py-3.5'>
			<span
				className={
					who === 'agent' ? 'w-10 sm:w-12 shrink-0 text-xs text-white/40' : 'w-10 sm:w-12 shrink-0 text-xs text-amber-300'
				}
			>
				{who}
			</span>
			<span className='flex-1 min-w-0'>
				<span className='block text-white/85'>{children}</span>
				<span className='block text-xs text-white/35 mt-0.5'>state: {state}</span>
			</span>
			<span className='shrink-0'>{action}</span>
		</li>
	)
}

// Mirrors the state buttons on the board
function StateChip({ tone, children }: { tone: 'blue' | 'green' | 'red'; children: React.ReactNode }) {
	const tones = {
		blue: 'bg-blue-600 text-white',
		green: 'bg-emerald-600 text-white',
		red: 'bg-red-600 text-white',
	}
	return <span className={`inline-block rounded px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

function Mono({ children }: { children: React.ReactNode }) {
	return <code className='font-mono text-white/70'>{children}</code>
}

function GithubMark({ className }: { className?: string }) {
	return (
		<svg viewBox='0 0 16 16' fill='currentColor' aria-hidden='true' className={className}>
			<path d='M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z' />
		</svg>
	)
}
