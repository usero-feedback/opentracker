import { SubmitOptions, useSubmit } from 'react-router'
import { z } from 'zod'

export function useMySubmit(): (target: Record<string, {}>, options?: SubmitOptions) => void {
	const submit = useSubmit()
	return async (event, options) => {
		const data = typeof event === 'object' ? jsonToFormData(event) : event
		return submit(data, options)
	}
}
export async function deserialise<S>(request: Request, type: z.ZodType<S>): Promise<S> {
	const formData = await request.formData()
	return deserialiseFormData(formData, type)
}
export async function deserialiseFormData<S>(formData: FormData, type: z.ZodType<S>): Promise<S> {
	const object = formDataToJson(formData)
	return type.parse(object)
}

const jsonKey = 'json'
export function jsonToFormData(jsonObject: Record<string, unknown>): FormData {
	const formData = new FormData()
	formData.set(jsonKey, JSON.stringify(jsonObject))
	return formData
}

export function formDataToJson(formData: FormData): Record<string, unknown> {
	const jsonStr = formData.get(jsonKey)
	if (typeof jsonStr !== 'string') throw new Error(`Form data has no "${jsonKey}" field`)
	return JSON.parse(jsonStr)
}

export function jsonToQueryParams(object: Record<string, unknown>): string {
	const params = new URLSearchParams()

	for (const [key, value] of Object.entries(object)) {
		if (Array.isArray(value)) {
			value.forEach(item => params.append(key, String(item)))
		} else {
			params.append(key, String(value))
		}
	}

	return params.toString()
}

export function queryParamsToJson(searchParams: URLSearchParams): Record<string, string | string[]> {
	const parsedParams: Record<string, string | string[]> = {}

	searchParams.forEach((value, key) => {
		const existing = parsedParams[key]
		if (existing === undefined) {
			parsedParams[key] = value
		} else if (Array.isArray(existing)) {
			existing.push(value)
		} else {
			parsedParams[key] = [existing, value]
		}
	})
	return parsedParams
}
