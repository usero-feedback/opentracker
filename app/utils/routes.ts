export const routes = {
	signup: '/signup',
	login: '/login',
	home: '/',
	userProfile: '/profile',
	tracker: '/tracker',
	trackerProject: (projectId: string) => `/tracker/${projectId}`,
}
