import { useContext } from 'react'
import { ModalContext } from '~/types/ModalTypes'

export const useModal = () => useContext(ModalContext)
