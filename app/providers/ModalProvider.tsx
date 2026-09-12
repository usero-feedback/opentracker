import React, { ReactNode, useCallback, useState } from 'react'
import { SetURLSearchParams } from 'react-router'
import { ModalContext, ModalState, buildModalSearchParams, modalStateKey, modalUrlKey } from '~/types/ModalTypes'

function ModalComponent(state: ModalState) {
	switch (state.type) {
		case 'placeholder':
			return <></>
		case 'confirmation':
			return <div className='p-4'>{state.message}</div>
		default:
			return state satisfies never
	}
}

export const ModalProvider: React.FC<{ children?: React.ReactNode; initial?: ModalState }> = ({ children, initial }) => {
	const [modal, setModal] = useState<ReactNode>(initial === undefined ? undefined : <ModalComponent {...initial} />)

	const setModalState = useCallback((state?: ModalState) => {
		if (state) {
			setModal(<ModalComponent {...state} />)
		} else {
			setModal(null)
		}
	}, [])

	const trySetModalState = useCallback((id: string, state: string | null) => {
		const props = state ? JSON.parse(decodeURIComponent(state)) : {}
		const modalState = { type: id, ...props }
		const parsedState = ModalState.safeParse(modalState)
		if (parsedState.success) {
			setModal(<ModalComponent {...parsedState.data} />)
		} else {
			console.error('invalid modal state', parsedState.error)
		}
	}, [])

	const navToModal = useCallback((state: ModalState, setSearchParams: SetURLSearchParams) => {
		setSearchParams((prev: URLSearchParams) => buildModalSearchParams(state, prev), { preventScrollReset: true })
	}, [])

	return (
		<ModalContext.Provider
			value={{
				modal,
				setModalState,
				trySetModalState,
				buildModalSearchParams,
				navToModal,
			}}
		>
			{children}
		</ModalContext.Provider>
	)
}

export function checkRequestForModal(request: Request) {
	return checkUrlForModal(request.url)
}

export function checkUrlForModal(url: string) {
	try {
		const searchParams = new URLSearchParams(new URL(url).search)
		const modalKey = searchParams.get(modalUrlKey)
		const props = JSON.parse(decodeURIComponent(searchParams.get(modalStateKey) ?? '{}'))
		const modalState = { type: modalKey, ...props }
		return ModalState.parse(modalState)
	} catch (e) {
		return undefined
	}
}
