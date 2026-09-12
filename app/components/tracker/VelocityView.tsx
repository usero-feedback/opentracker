import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import type { VelocityDataPoint } from './types'

interface VelocityViewProps {
	data: VelocityDataPoint[]
	targetVelocity: number
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function VelocityView({ data, targetVelocity, open, onOpenChange }: VelocityViewProps) {
	// Calculate stats
	const recentData = data.slice(-6) // Last 6 iterations
	const average = recentData.length > 0 ? Math.round(recentData.reduce((sum, d) => sum + d.points, 0) / recentData.length) : 0

	const currentIteration = data[data.length - 1]
	const currentPoints = currentIteration?.points ?? 0

	// Calculate trend (comparing average to target)
	const trend = average > targetVelocity ? 'up' : average < targetVelocity ? 'down' : 'stable'
	const trendDiff = Math.abs(average - targetVelocity)

	// Chart dimensions
	const maxPoints = Math.max(...data.map(d => d.points), targetVelocity) * 1.1 // Add 10% padding
	const chartHeight = 280
	const chartWidth = 600
	const barWidth = Math.min(40, chartWidth / (data.length * 1.5))
	const spacing = barWidth * 0.3

	// Format date for display
	const formatDate = (date: Date): string => {
		return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='max-w-4xl bg-slate-900 border-slate-700 text-slate-100 max-h-[90vh] overflow-y-auto'>
				<DialogHeader className='border-b border-slate-700 pb-4'>
					<DialogTitle className='flex items-center gap-3 text-slate-100'>
						<TrendingUp className='h-5 w-5 text-blue-400' />
						Velocity Report
					</DialogTitle>
				</DialogHeader>

				{/* Stats Cards */}
				<div className='grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-b border-slate-800'>
					<div className='bg-slate-800/50 rounded-lg p-4 border border-slate-700/50'>
						<div className='text-xs text-slate-500 mb-1'>Average Velocity</div>
						<div className='text-2xl font-bold text-slate-100'>{average}</div>
						<div className='text-xs text-slate-400 mt-1'>Last 6 iterations</div>
					</div>

					<div className='bg-slate-800/50 rounded-lg p-4 border border-slate-700/50'>
						<div className='text-xs text-slate-500 mb-1'>Current Iteration</div>
						<div className='text-2xl font-bold text-slate-100'>{currentPoints}</div>
						<div className='text-xs text-slate-400 mt-1'>
							{currentIteration ? `Iteration ${currentIteration.iteration}` : 'No data'}
						</div>
					</div>

					<div className='bg-slate-800/50 rounded-lg p-4 border border-slate-700/50'>
						<div className='text-xs text-slate-500 mb-1'>Trend</div>
						<div className='flex items-center gap-2'>
							{trend === 'up' && (
								<>
									<TrendingUp className='h-5 w-5 text-green-400' />
									<span className='text-2xl font-bold text-green-400'>+{trendDiff}</span>
								</>
							)}
							{trend === 'down' && (
								<>
									<TrendingDown className='h-5 w-5 text-red-400' />
									<span className='text-2xl font-bold text-red-400'>-{trendDiff}</span>
								</>
							)}
							{trend === 'stable' && (
								<>
									<Minus className='h-5 w-5 text-slate-400' />
									<span className='text-2xl font-bold text-slate-400'>0</span>
								</>
							)}
						</div>
						<div className='text-xs text-slate-400 mt-1'>vs. target {targetVelocity}</div>
					</div>
				</div>

				{/* Chart */}
				<div className='py-6'>
					<div className='text-sm font-medium text-slate-300 mb-4'>Points Completed Per Iteration</div>

					{data.length === 0 ? (
						<div className='text-center py-12 text-slate-500'>
							No velocity data available. Complete some stories to see velocity metrics.
						</div>
					) : (
						<div className='overflow-x-auto'>
							<svg width={Math.max(chartWidth, data.length * (barWidth + spacing))} height={chartHeight + 60} className='mx-auto'>
								{/* Grid lines */}
								{[0, 0.25, 0.5, 0.75, 1].map(fraction => {
									const y = chartHeight - chartHeight * fraction
									const value = Math.round(maxPoints * fraction)
									return (
										<g key={fraction}>
											<line
												x1={0}
												y1={y}
												x2={Math.max(chartWidth, data.length * (barWidth + spacing))}
												y2={y}
												stroke='#334155'
												strokeWidth='1'
												strokeDasharray='4 4'
											/>
											<text x={-8} y={y + 4} textAnchor='end' className='text-xs fill-slate-500'>
												{value}
											</text>
										</g>
									)
								})}

								{/* Target velocity line */}
								{targetVelocity > 0 && (
									<>
										<line
											x1={0}
											y1={chartHeight - (targetVelocity / maxPoints) * chartHeight}
											x2={Math.max(chartWidth, data.length * (barWidth + spacing))}
											y2={chartHeight - (targetVelocity / maxPoints) * chartHeight}
											stroke='#3b82f6'
											strokeWidth='2'
											strokeDasharray='6 4'
										/>
										<text
											x={Math.max(chartWidth, data.length * (barWidth + spacing)) - 10}
											y={chartHeight - (targetVelocity / maxPoints) * chartHeight - 8}
											textAnchor='end'
											className='text-xs fill-blue-400 font-medium'
										>
											Target: {targetVelocity}
										</text>
									</>
								)}

								{/* Bars */}
								{data.map((point, index) => {
									const barHeight = (point.points / maxPoints) * chartHeight
									const x = index * (barWidth + spacing) + 30
									const y = chartHeight - barHeight

									// Color bars based on comparison to target
									const barColor =
										point.points >= targetVelocity
											? '#10b981' // green
											: point.points >= targetVelocity * 0.8
												? '#f59e0b' // amber
												: '#ef4444' // red

									return (
										<g key={point.iteration}>
											{/* Bar */}
											<rect x={x} y={y} width={barWidth} height={barHeight} fill={barColor} opacity='0.9' rx='2' />

											{/* Value on top */}
											<text x={x + barWidth / 2} y={y - 6} textAnchor='middle' className='text-xs fill-slate-300 font-medium'>
												{point.points}
											</text>

											{/* Iteration number */}
											<text x={x + barWidth / 2} y={chartHeight + 20} textAnchor='middle' className='text-xs fill-slate-400'>
												{point.iteration}
											</text>

											{/* Date range */}
											<text x={x + barWidth / 2} y={chartHeight + 36} textAnchor='middle' className='text-[10px] fill-slate-500'>
												{formatDate(point.startDate)}
											</text>
										</g>
									)
								})}
							</svg>
						</div>
					)}
				</div>

				{/* Legend */}
				<div className='flex items-center justify-center gap-6 text-xs pb-2'>
					<div className='flex items-center gap-2'>
						<div className='w-3 h-3 bg-green-500 rounded'></div>
						<span className='text-slate-400'>Met target</span>
					</div>
					<div className='flex items-center gap-2'>
						<div className='w-3 h-3 bg-amber-500 rounded'></div>
						<span className='text-slate-400'>80-99% of target</span>
					</div>
					<div className='flex items-center gap-2'>
						<div className='w-3 h-3 bg-red-500 rounded'></div>
						<span className='text-slate-400'>Below 80%</span>
					</div>
					<div className='flex items-center gap-2'>
						<div className='w-8 h-0.5 bg-blue-500 border-blue-500' style={{ borderTop: '2px dashed' }}></div>
						<span className='text-slate-400'>Target velocity</span>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
