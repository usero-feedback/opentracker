import { useEffect } from 'react'
import { Links, LinksFunction, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from 'react-router'

import { Route } from '.react-router/types/app/routes/+types/_'
import { UseroFeedbackWidget } from '@usero/sdk/react'
import { GeneralErrorBoundary } from '~/components/GeneralErrorBoundary'
import { GoogleAnalytics } from '~/components/GoogleAnalytics'
import { Toaster } from '~/components/ui/toaster'
import { clearUserId, setUserId } from '~/utils/analytics'
import { buildFrontendConfig } from '~/utils/frontendConfig'
import { getUser } from '~/utils/session.server'
import './app.css'

export async function loader({ context, request }: Route.LoaderArgs) {
	const frontendConfig = buildFrontendConfig(context.cloudflare.env)
	const user = await getUser(request, context)
	return {
		frontendConfig,
		user,
	}
}

export const links: LinksFunction = () => [
	{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
	{
		rel: 'preconnect',
		href: 'https://fonts.gstatic.com',
		crossOrigin: 'anonymous',
	},
	{
		rel: 'stylesheet',
		href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
	},
]

export default function App() {
	const data = useLoaderData<typeof loader>()

	// Set Google Analytics user ID when user is logged in
	useEffect(() => {
		if (data.user) {
			setUserId(data.user.id)
		} else {
			clearUserId()
		}
	}, [data.user])

	// Lets e2e tests wait for React to attach handlers instead of sleeping
	useEffect(() => {
		document.documentElement.dataset.hydrated = 'true'
	}, [])

	return (
		<html lang='en'>
			<head>
				<meta charSet='utf-8' />
				<meta name='viewport' content='width=device-width, initial-scale=1' />
				<Meta />
				<Links />
				<link rel='manifest' href='/resources/manifest.json?v=2' />
				<link rel='icon' href='/icons/favicon.svg?v=2' type='image/svg+xml' />
				<link rel='icon' href='/icons/favicon-96x96.png?v=2' sizes='96x96' type='image/png' />
				<link rel='apple-touch-icon' href='/icons/apple-touch-icon.png?v=2' sizes='180x180' />
				{data.frontendConfig.gaId && <GoogleAnalytics gaId={data.frontendConfig.gaId} />}
			</head>
			<body className='min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900'>
				<Outlet />
				<ScrollRestoration />
				<Toaster />
				<Scripts />
				{data.frontendConfig.useroClientId && (
					<UseroFeedbackWidget
						clientId={data.frontendConfig.useroClientId}
						environment={data.frontendConfig.environment}
						user={data.user ? { id: data.user.id, email: data.user.email } : null}
					/>
				)}
			</body>
		</html>
	)
}

export const ErrorBoundary = GeneralErrorBoundary
