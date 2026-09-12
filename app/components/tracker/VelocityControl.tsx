import { useState, useRef, useEffect } from 'react'
import { cn } from '~/lib/utils'

interface VelocityControlProps {
	velocity: number
	onChange: (velocity: number) => void
}

export function VelocityControl({ velocity, onChange }: VelocityControlProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [inputValue, setInputValue] = useState(velocity.toString())
	const inputRef = useRef<HTMLInputElement>(null)

	// Sync input value when velocity prop changes (and not editing)
	useEffect(() => {
		if (!isEditing) {
			setInputValue(velocity.toString())
		}
	}, [velocity, isEditing])

	// Focus input when editing starts
	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus()
			inputRef.current.select()
		}
	}, [isEditing])

	const handleClick = () => {
		setIsEditing(true)
	}

	const handleBlur = () => {
		commitValue()
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			commitValue()
		} else if (e.key === 'Escape') {
			setInputValue(velocity.toString())
			setIsEditing(false)
		}
	}

	const commitValue = () => {
		const parsed = parseInt(inputValue, 10)
		if (!isNaN(parsed) && parsed > 0) {
			onChange(parsed)
		} else {
			setInputValue(velocity.toString())
		}
		setIsEditing(false)
	}

	if (isEditing) {
		return (
			<input
				ref={inputRef}
				type='number'
				min='1'
				max='100'
				value={inputValue}
				onChange={e => setInputValue(e.target.value)}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				className={cn(
					'w-12 px-1.5 py-0.5 text-xs font-mono text-center rounded',
					'bg-slate-700 border border-blue-500 text-slate-200',
					'focus:outline-none focus:ring-1 focus:ring-blue-500',
				)}
			/>
		)
	}

	return (
		<button
			onClick={handleClick}
			className={cn(
				'inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors',
				'text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-700/50',
				'border border-transparent hover:border-slate-600',
			)}
			title='Click to change velocity (simulation only, resets on refresh)'
		>
			<span className='text-slate-500'>∨</span>
			<span>{velocity}</span>
		</button>
	)
}
