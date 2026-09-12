import { ActionFunction, ActionFunctionArgs } from 'react-router'
import { logout } from '~/utils/session.server'
import { GeneralErrorBoundary } from '~/components/GeneralErrorBoundary'

// have to use action instead of loader here because a weird double-redirect bug breaks logout from routes not /
export const action: ActionFunction = async ({ request, context }: ActionFunctionArgs) => logout(request, context)

export const ErrorBoundary = GeneralErrorBoundary
