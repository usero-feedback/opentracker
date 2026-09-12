export function formatDollars(num: number, twoDp: boolean = false) {
	const numDp = twoDp ? 2 : 0
	const format = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: numDp,
		maximumFractionDigits: numDp,
	})
	return format.format(num)
}

export function formatCents(num: number, twoDp: boolean = false) {
	return formatDollars(num / 100, twoDp)
}
