import { FieldErrors, FieldValues } from 'react-hook-form'

export function RHFError<S extends FieldValues>({ errors, name }: { errors: FieldErrors<S>; name: keyof S }) {
	const error = errors[name]?.message?.toString()
	return <ErrorText error={error} />
}
export function ErrorText({ error }: { error?: string }) {
	// not working with ' ' for some reason
	return <p className='text-red-500 text-xs font-semibold mt-0.5'>{error}&nbsp;</p>
}
