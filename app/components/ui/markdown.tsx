import ReactMarkdown from 'react-markdown'
import { cn } from '~/lib/utils'

interface MarkdownProps {
	children: string
	className?: string
}

export function Markdown({ children, className }: MarkdownProps) {
	return (
		<div
			className={cn(
				'prose prose-sm prose-invert max-w-none',
				// Headings
				'prose-headings:text-slate-200 prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2',
				'prose-h1:text-lg prose-h2:text-base prose-h3:text-sm',
				// Paragraphs
				'prose-p:text-slate-300 prose-p:my-2 prose-p:leading-relaxed',
				// Lists
				'prose-ul:my-2 prose-ol:my-2 prose-li:text-slate-300 prose-li:my-0.5',
				// Links
				'prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline',
				// Code
				'prose-code:text-slate-200 prose-code:bg-slate-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none',
				'prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700 prose-pre:rounded prose-pre:p-3',
				// Blockquotes
				'prose-blockquote:border-l-2 prose-blockquote:border-slate-500 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-slate-400 prose-blockquote:my-2',
				// Strong/Bold
				'prose-strong:text-slate-200 prose-strong:font-semibold',
				// Horizontal rule
				'prose-hr:border-slate-700 prose-hr:my-4',
				className,
			)}
		>
			<ReactMarkdown>{children}</ReactMarkdown>
		</div>
	)
}
