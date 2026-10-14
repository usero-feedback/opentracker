import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CloudflareWebAnalytics } from '~/components/CloudflareWebAnalytics'
import { buildFrontendConfig } from '~/utils/frontendConfig'

const TOKEN = '0123456789abcdef0123456789abcdef'

describe('CloudflareWebAnalytics', () => {
	it('adds the official beacon with the token after load', () => {
		const html = renderToStaticMarkup(<CloudflareWebAnalytics token={TOKEN} />)
		expect(html).toContain(`s.src = 'https://static.cloudflareinsights.com/beacon.min.js'`)
		expect(html).toContain(`s.setAttribute('data-cf-beacon', '{"token":"${TOKEN}"}')`)
	})

	it('renders nothing for a malformed token', () => {
		expect(renderToStaticMarkup(<CloudflareWebAnalytics token={`${TOKEN}'</script>`} />)).toBe('')
	})

	it('only exposes the token in prod', () => {
		const vars = { CLOUDFLARE_WEB_ANALYTICS_TOKEN: TOKEN }
		expect(buildFrontendConfig({ ...vars, ENVIRONMENT: 'prod' }).cfWebAnalyticsToken).toBe(TOKEN)
		expect(buildFrontendConfig({ ...vars, ENVIRONMENT: 'local' }).cfWebAnalyticsToken).toBeUndefined()
		expect(buildFrontendConfig(vars).cfWebAnalyticsToken).toBeUndefined()
	})
})
