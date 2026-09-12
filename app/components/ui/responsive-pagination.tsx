import { Button } from '~/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ResponsivePaginationProps {
	currentPage: number
	totalPages: number
	onPageChange: (page: number) => void
	showingFrom?: number
	showingTo?: number
	totalItems?: number
}

export function ResponsivePagination({
	currentPage,
	totalPages,
	onPageChange,
	showingFrom,
	showingTo,
	totalItems,
}: ResponsivePaginationProps) {
	return (
		<div className='flex items-center justify-between gap-4 pt-4'>
			{/* Mobile: Simple prev/next */}
			<div className='flex md:hidden items-center justify-between w-full'>
				<Button variant='outline' size='sm' onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
					<ChevronLeft className='h-4 w-4' />
				</Button>
				<span className='text-sm text-muted-foreground'>
					{currentPage} / {totalPages}
				</span>
				<Button variant='outline' size='sm' onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
					<ChevronRight className='h-4 w-4' />
				</Button>
			</div>

			{/* Desktop: Full pagination info */}
			<div className='hidden md:flex items-center justify-between w-full'>
				{showingFrom !== undefined && showingTo !== undefined && totalItems !== undefined && (
					<p className='text-sm text-muted-foreground'>
						Showing {showingFrom} to {showingTo} of {totalItems} items
					</p>
				)}
				<div className='flex items-center gap-2'>
					<Button variant='outline' size='sm' onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
						Previous
					</Button>
					{/* Page numbers - show up to 5 pages */}
					{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
						const page = i + 1
						return (
							<Button
								key={page}
								variant={currentPage === page ? 'default' : 'outline'}
								size='sm'
								onClick={() => onPageChange(page)}
							>
								{page}
							</Button>
						)
					})}
					{totalPages > 5 && <span className='text-muted-foreground'>...</span>}
					<Button variant='outline' size='sm' onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
						Next
					</Button>
				</div>
			</div>
		</div>
	)
}
