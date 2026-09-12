import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'

interface CodeBlockProps {
	code: string
}

export function CodeBlock({ code }: CodeBlockProps) {
	const [isCopied, setIsCopied] = useState(false)

	const copyToClipboard = () => {
		navigator.clipboard.writeText(code).then(() => {
			setIsCopied(true)
			setTimeout(() => setIsCopied(false), 2000) // Reset after 2 seconds
		})
	}

	return (
		<div className='bg-gray-900 rounded-xl border border-gray-700 overflow-hidden relative'>
			<div className='p-6 overflow-x-auto max-w-full'>
				<pre className='text-green-400 font-mono text-xs md:text-sm'>{code}</pre>
			</div>
			<Button
				onClick={copyToClipboard}
				variant='ghost'
				size='icon'
				className='absolute top-2 right-2 h-10 w-10 sm:h-8 sm:w-8 bg-gray-800 hover:bg-gray-700'
			>
				{isCopied ? <Check className='h-4 w-4 text-green-500' /> : <Copy className='h-4 w-4' />}
			</Button>
		</div>
	)
}
