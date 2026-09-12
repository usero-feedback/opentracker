import { data, LoaderFunction } from 'react-router'

export let loader: LoaderFunction = () => {
	return data(
		{
			name: 'opentracker',
			description: 'The story board your coding agents work from',
			start_url: '/',
			display: 'standalone',
			background_color: '#0a0a0b',
			theme_color: '#0a0a0b',
			icons: [
				{
					src: '/icons/favicon-96x96.png',
					sizes: '96x96',
					type: 'image/png',
				},
				{
					src: '/icons/web-app-manifest-192x192.png',
					sizes: '192x192',
					type: 'image/png',
				},
				{
					src: '/icons/web-app-manifest-512x512.png',
					sizes: '512x512',
					type: 'image/png',
					purpose: 'maskable',
				},
				{
					src: '/icons/apple-touch-icon.png',
					sizes: '180x180',
					type: 'image/png',
				},
				{
					src: '/icons/favicon.svg',
					sizes: 'any',
					type: 'image/svg+xml',
				},
			],
		},
		{
			headers: {
				// 'Cache-Control': 'public, max-age=600',
			},
		},
	)
}
