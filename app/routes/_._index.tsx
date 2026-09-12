import { LoaderFunctionArgs, MetaFunction, redirect } from 'react-router'
import { GeneralErrorBoundary } from '~/components/GeneralErrorBoundary'
import { LandingPage } from '~/components/LandingPage'
import { getUser } from '~/utils/session.server'

export const meta: MetaFunction = () => {
	return [
		{ title: 'opentracker, the story board your coding agents work from' },
		{
			name: 'description',
			content:
				'An open source Pivotal Tracker style board with an MCP server. Agents pick up stories and mark them finished; you accept or reject.',
		},
		{
			name: 'keywords',
			content: 'story board, coding agents, mcp server, pivotal tracker alternative, open source',
		},

		// Open Graph
		{ property: 'og:title', content: 'opentracker, the story board your coding agents work from' },
		{
			property: 'og:description',
			content:
				'An open source Pivotal Tracker style board with an MCP server. Agents pick up stories and mark them finished; you accept or reject.',
		},
		{ property: 'og:type', content: 'website' },
		{ property: 'og:url', content: 'https://tracker.usero.io' },
		{ property: 'og:image', content: 'https://tracker.usero.io/imgs/both-devices-without-background.png' },

		// Twitter Card
		{ name: 'twitter:card', content: 'summary_large_image' },
		{ name: 'twitter:title', content: 'opentracker, the story board your coding agents work from' },
		{
			name: 'twitter:description',
			content: 'An open source Pivotal Tracker style board with an MCP server for coding agents.',
		},
		{ name: 'twitter:image', content: 'https://tracker.usero.io/imgs/both-devices-without-background.png' },

		// Additional SEO
		{ name: 'author', content: 'opentracker' },
		{ name: 'robots', content: 'index, follow' },
		{ name: 'language', content: 'English' },
	]
}

export async function loader({ request, context }: LoaderFunctionArgs) {
	const user = await getUser(request, context)

	// If user is logged in, redirect to tracker
	if (user) {
		return redirect('/tracker')
	}

	return null
}

export default function Component() {
	return <LandingPage />
}

export const ErrorBoundary = GeneralErrorBoundary
