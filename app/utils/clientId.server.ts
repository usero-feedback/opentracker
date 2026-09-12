export const generateClientId = () => {
	return `client_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
}
