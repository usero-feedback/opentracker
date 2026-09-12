import { endOfWeek, getISOWeek, getISOWeekYear, setISOWeek, startOfWeek } from 'date-fns'

export function formatISOWeek(date: Date): string {
	const year = getISOWeekYear(date)
	const week = String(getISOWeek(date)).padStart(2, '0')
	return `${year}-W${week}`
}

export function getWeekRange(isoWeek: string): { start: Date; end: Date } {
	// Parse the ISO week string to a Date
	const [year, week] = isoWeek.split('-W').map(Number)

	// Create date from year and set the ISO week
	const date = setISOWeek(new Date(year, 0, 1), week)

	// Get start and end of the week
	const start = startOfWeek(date, { weekStartsOn: 1 }) // 1 = Monday
	const end = endOfWeek(date, { weekStartsOn: 1 })

	return { start, end }
}
