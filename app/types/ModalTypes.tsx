import { createContext } from 'react'
import { SetURLSearchParams, useSearchParams } from 'react-router'
import { z } from 'zod'
import { useModal } from '~/hooks/useModal'

const Placeholder = z.object({ type: z.literal('placeholder') })
const Confirmation = z.object({ type: z.literal('confirmation'), message: z.string() })

export const ModalState = z.union([Placeholder, Confirmation])
export type ModalId = ModalState['type']

export type ModalState = z.infer<typeof ModalState>

export type ModalContextType = {
	modal: React.ReactNode
	setModalState: (state?: ModalState) => void
	trySetModalState: (_: string, state: string | null) => void
	buildModalSearchParams: (state: ModalState) => URLSearchParams
	navToModal: (state: ModalState, setSearchParams: SetURLSearchParams) => void
}

export const ModalContext = createContext<ModalContextType>({
	modal: null,
	setModalState: (state?: ModalState) => {},
	trySetModalState: (_: string, state: string | null) => {},
	buildModalSearchParams: (state: ModalState) => {
		return new URLSearchParams()
	},
	navToModal: (state: ModalState, setSearchParams: SetURLSearchParams) => {},
})

export const modalUrlKey = 'm'
export const modalStateKey = 'ms'

export function getModalState(searchParams: URLSearchParams): ModalState | undefined {
	const type = searchParams.get(modalUrlKey)
	const state = searchParams.get(modalStateKey)
	if (!type || !state) return undefined
	const parseResult = ModalState.safeParse({ type, ...JSON.parse(decodeURIComponent(state)) })
	return parseResult.error ? undefined : parseResult.data
}
export const buildModalSearchParams = ({ type, ...rest }: ModalState, queryParams?: URLSearchParams) => {
	const params = new URLSearchParams(queryParams?.toString() || '')
	params.set(modalUrlKey, type)
	if (JSON.stringify(rest) !== JSON.stringify({})) {
		params.set(modalStateKey, encodeURIComponent(JSON.stringify(rest)))
	}
	return params
}
export function buildModalUrl(state: ModalState, queryParams?: URLSearchParams) {
	return `?${buildModalSearchParams(state, queryParams).toString()}`
}

export const useOnModalClose = () => {
	const [searchParams, setSearchParams] = useSearchParams()
	const { setModalState } = useModal()

	return {
		onClose: () => {
			if (searchParams.has(modalUrlKey)) {
				setSearchParams(
					prev => {
						prev.delete(modalUrlKey)
						prev.delete(modalStateKey)
						return prev
					},
					{ preventScrollReset: true },
				)
			}
			setModalState(undefined)
		},
	}
}
