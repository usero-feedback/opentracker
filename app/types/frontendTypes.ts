export function greenRedText(number: number) {
	return number === 0 ? '' : number > 0 ? 'text-green-500' : 'text-red-500'
}
