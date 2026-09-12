export const routes = {
	signup: '/signup',
	login: '/login',
	home: '/',
	userProfile: '/profile',
	clients: '/clients',
	clientDashboard: (clientId: string, env?: string) => (env ? `/dashboard/${clientId}/${env}` : `/dashboard/${clientId}`),
	tracker: '/tracker',
	trackerProject: (projectId: string) => `/tracker/${projectId}`,
}
