import { useCallback, useRef, useState } from 'react'

export function useDragAndDrop(onFileUploaded: (file: File) => void) {
	const [isDragging, setIsDragging] = useState(false)
	const dragCounter = useRef(0)

	const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
	}, [])

	const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		dragCounter.current += 1
		if (e.dataTransfer.types.includes('Files')) {
			setIsDragging(true)
		}
	}, [])

	const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		dragCounter.current -= 1
		if (dragCounter.current === 0) {
			setIsDragging(false)
		}
	}, [])

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()
			e.stopPropagation()
			setIsDragging(false)
			dragCounter.current = 0

			const files = e.dataTransfer.files
			if (files && files.length > 0) {
				const file = files[0]
				if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
					onFileUploaded(file)
				}
			}
		},
		[onFileUploaded],
	)

	// Return the props needed for the div element
	return {
		isDragging,
		dragProps: {
			onDragEnter: handleDragEnter,
			onDragLeave: handleDragLeave,
			onDragOver: handleDrag,
			onDrop: handleDrop,
		},
	}
}
