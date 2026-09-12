import { AppLoadContext, Session, SessionData } from 'react-router'
import { errorToString } from '~/utils/errorToString'
import { flashToast, getUserSession, updateSessionAndRedirect, updateSessionAndReturn } from '~/utils/session.server'

export async function showToastOnError<T>(fn: () => Promise<T>, request: Request, context: AppLoadContext, redirectUrl?: string) {
	const session = await getUserSession(request, context)
	try {
		return await fn()
	} catch (e: unknown) {
		console.error(e)
		const sessionMutator = (it: Session<SessionData, SessionData>) =>
			flashToast(it, { title: errorToString(e), variant: 'destructive' })
		return redirectUrl
			? updateSessionAndRedirect(context, session, sessionMutator, redirectUrl)
			: updateSessionAndReturn(context, session, sessionMutator, {})
	}
}
