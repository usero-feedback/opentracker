import * as React from 'react'
import type { ToastActionElement, ToastProps } from '~/components/ui/toast'

export type ToasterToast = ToastProps & {
	id: string
	title?: React.ReactNode
	description?: React.ReactNode
	action?: ToastActionElement
}

export type ToastLinkAction = {
	label: string
	href: string
}

export type BackendToastConfig = {
	id: number
	title?: string
	description?: string
	variant?: ToastProps['variant']
	duration?: number
	linkAction?: ToastLinkAction
}
