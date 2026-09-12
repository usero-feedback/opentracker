import { CloudUpload } from 'lucide-react'

export function DragOverlay() {
	return (
		<div className='fixed inset-0 bg-blue-500/20 flex items-center justify-center z-50 pointer-events-none'>
			<div className='bg-white dark:bg-zinc-800 p-8 rounded-xl shadow-lg text-center'>
				<CloudUpload className='w-16 h-16 text-blue-500 mx-auto mb-4' />
				<p className='text-lg font-medium'>Drop your CSV file here</p>
			</div>
		</div>
	)
}
