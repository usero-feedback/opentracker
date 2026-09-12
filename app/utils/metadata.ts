import { MetaDescriptor } from 'react-router'
import { redirectToKey } from '~/types'

export function canonicalMetadata(request: Request): MetaDescriptor {
	let url = new URL(request.url)
	url.searchParams.delete(redirectToKey)
	return { tagName: 'link', rel: 'canonical', href: url.toString() }
}
