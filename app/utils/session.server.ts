import {
	AppLoadContext,
	Session,
	SessionData,
	UNSAFE_DataWithResponseInit,
	createCookie,
	createCookieSessionStorage,
	data,
	redirect,
} from 'react-router'
import { z } from 'zod'
import { getRedirectToFromSearchParams, redirectToKey } from '~/types'
import { contextToBackendConfig } from '~/utils/backendConfig'
import { routes } from '~/utils/routes'
import { BackendToastConfig } from '~/utils/ToasterTypes'

export const sessionMaxAge = 60 * 60 * 24 * 360

export const createSessionCookie = (context: AppLoadContext) => {
	const config = contextToBackendConfig(context)
	return createCookie('__sessionTracker', {
		// Local dev runs over plain http, so the Secure flag would make the browser drop the cookie.
		secure: !['dev', 'local'].includes(config.environment),
		secrets: [config.sessionSecret],
		sameSite: 'lax',
		path: '/',
		maxAge: sessionMaxAge,
		httpOnly: true,
	})
}

export const createStorage = (context: AppLoadContext) => {
	const storage = createCookieSessionStorage({
		cookie: createSessionCookie(context),
	})
	overrideExpiration(storage)
	return storage
}

export function getUserSession(request: Request, context: AppLoadContext, storage = createStorage(context)): Promise<Session> {
	return storage.getSession(request.headers.get('Cookie'))
}

export async function getUser(request: Request, context: AppLoadContext): Promise<UserSessionInfo | null> {
	const session = await getUserSession(request, context)
	return getUserFromSession(session)
}
export async function getUserFromSession(session: Session<SessionData, SessionData>) {
	const raw = session.get(userKey)
	const parsed = UserSessionInfo.safeParse(raw)
	return parsed.success ? parsed.data : null
}

export async function requireUser(request: Request, context: AppLoadContext, redirectTo?: string) {
	const user = await getUser(request, context)
	if (!user) {
		const redirectString = getLoginRedirectString(request, redirectTo)
		throw redirect(redirectString)
	}
	return user
}
export function getLoginRedirectString(request: Request, redirectTo: string = buildRedirectTo(request)) {
	const redirectSearchParams = new URLSearchParams([[redirectToKey, encodeURI(redirectTo)]])
	return `${routes.login}?${redirectSearchParams.toString()}`
}

export async function logout(request: Request, context: AppLoadContext) {
	const redirectTo = getRedirectToFromRequest(request)
	const session = await getUserSession(request, context)
	const storage = createStorage(context)
	return redirect(redirectTo, {
		headers: {
			'Set-Cookie': await storage.destroySession(session),
		},
	})
}

export type SessionMutator = (s: Session<SessionData, SessionData>) => void

export async function createUserSessionAndRedirect(
	user: UserSessionInfo,
	context: AppLoadContext,
	redirectTo: string,
	request?: Request,
) {
	const session = await createUserSession(user, context, request)
	return updateSessionAndRedirect(context, session, () => {}, redirectTo)
}
export async function createUserSession(user: UserSessionInfo, context: AppLoadContext, request?: Request) {
	const storage = createStorage(context)
	// reuse the old session so we can do stuff like save the data wthe user filled out before logging in and carry it across
	const session = await (request ? getUserSession(request, context) : storage.getSession())
	session.set(userKey, user)
	return session
}
const userKey = 'user'

export const UserSessionInfo = z.object({
	id: z.string(),
	email: z.string(),
})
export type UserSessionInfo = z.infer<typeof UserSessionInfo>

export async function updateSessionAndReturn<S = {}>(
	context: AppLoadContext,
	session: Session<SessionData, SessionData>,
	sessionMutator: SessionMutator,
	dataArg: S,
): Promise<UNSAFE_DataWithResponseInit<S>> {
	const storage = createStorage(context)
	sessionMutator(session)
	return data(dataArg, {
		headers: {
			'Set-Cookie': await storage.commitSession(session),
		},
	})
}
export async function updateSessionAndRedirect(
	context: AppLoadContext,
	session: Session<SessionData, SessionData>,
	sessionMutator: SessionMutator,
	redirectTo: string,
) {
	const storage = createStorage(context)
	sessionMutator(session)
	return redirect(redirectTo, {
		headers: {
			'Set-Cookie': await storage.commitSession(session),
		},
	})
}

export function buildRedirectTo(request: Request): string {
	const url = new URL(request.url)
	return url.pathname + url.search
}
export function getRedirectToFromRequest(request: Request, defaultVal?: string): string {
	const url = new URL(request.url)
	return getRedirectToFromSearchParams(url.searchParams) ?? defaultVal ?? routes.home
}

const toastKey = 'toast'
export function flashToast(session: Session<SessionData, SessionData>, config: Omit<BackendToastConfig, 'id'>) {
	const backendConfig: BackendToastConfig = { ...config, id: Date.now() }
	session.flash(toastKey, backendConfig)
}
export async function getSessionToast(session: Session<SessionData, SessionData>): Promise<BackendToastConfig | undefined> {
	return session.get(toastKey) as BackendToastConfig | undefined
}

function overrideExpiration(storage: ReturnType<typeof createStorage>) {
	// we have to do this because every time you commit the session you overwrite it
	// so we store the expiration time in the cookie and reset it every time we commit
	const originalCommitSession = storage.commitSession

	Object.defineProperty(storage, 'commitSession', {
		value: async function commitSession(...args: Parameters<typeof originalCommitSession>) {
			const [session, options] = args
			if (options?.expires) {
				session.set('expires', options.expires)
			}
			if (options?.maxAge) {
				session.set('expires', new Date(Date.now() + options.maxAge * 1000))
			}
			const expires = session.has('expires') ? new Date(session.get('expires')) : undefined
			const setCookieHeader = await originalCommitSession(session, {
				...options,
				expires,
			})
			return setCookieHeader
		},
	})
}
