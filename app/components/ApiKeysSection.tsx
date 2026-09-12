import { formatDistanceToNow } from 'date-fns'
import { Check, Copy, KeyRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useFetcher } from 'react-router'
import { StatusButton } from '~/components/StatusButton'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { jsonToFormData } from '~/utils/deserialise'

export type ApiKeySummary = {
	id: string
	name: string
	prefix: string
	lastUsedAt: string | null
	createdAt: string
}

type CreatedKey = { key: string; name: string }

// showToastOnError erases the action's return type, so narrow the fetcher payload by hand.
function readCreatedKey(data: unknown): CreatedKey | null {
	if (typeof data !== 'object' || data === null) return null
	const { newApiKey, newApiKeyName } = data as { newApiKey?: unknown; newApiKeyName?: unknown }
	if (typeof newApiKey !== 'string') return null
	return { key: newApiKey, name: typeof newApiKeyName === 'string' ? newApiKeyName : 'API key' }
}

function ago(iso: string) {
	return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

export function ApiKeysSection({ apiKeys, dashboardUrl }: { apiKeys: ApiKeySummary[]; dashboardUrl: string }) {
	const createFetcher = useFetcher()
	const revokeFetcher = useFetcher()
	const [name, setName] = useState('')
	// Seeded from fetcher.data, then owned here so revalidation and later submits cannot clear it.
	const [created, setCreated] = useState<CreatedKey | null>(null)
	const [confirmingId, setConfirmingId] = useState<string | null>(null)

	useEffect(() => {
		const next = readCreatedKey(createFetcher.data)
		if (next) setCreated(next)
	}, [createFetcher.data])

	const creating = createFetcher.state !== 'idle'
	const revoking = revokeFetcher.state !== 'idle'

	const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		const trimmed = name.trim()
		if (!trimmed || creating) return
		createFetcher.submit(jsonToFormData({ type: 'createApiKey', name: trimmed }), { method: 'post' })
		setName('')
	}

	const handleRevoke = (id: string) => {
		revokeFetcher.submit(jsonToFormData({ type: 'revokeApiKey', id }), { method: 'post' })
		setConfirmingId(null)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>API keys</CardTitle>
				<CardDescription>
					Connect Claude Code or any MCP client at{' '}
					<code className='font-mono text-[0.8em] text-foreground'>{`${dashboardUrl}/mcp`}</code>, or call the API directly. Send
					a key as <code className='font-mono text-[0.8em] text-foreground'>Authorization: Bearer lt_...</code>. A key acts as you
					across every project you own.
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-5'>
				{created && <NewKeyPanel created={created} onDismiss={() => setCreated(null)} />}

				{apiKeys.length === 0 ? (
					<div className='flex items-center gap-3 rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground'>
						<KeyRound className='h-4 w-4 shrink-0' aria-hidden />
						<span>No keys yet. Name one below to get started.</span>
					</div>
				) : (
					<ul className='divide-y rounded-lg border'>
						{apiKeys.map(key => (
							<li key={key.id} className='px-4 py-3 text-sm'>
								{confirmingId === key.id ? (
									<RevokeConfirm name={key.name} onConfirm={() => handleRevoke(key.id)} onCancel={() => setConfirmingId(null)} />
								) : (
									<div className='flex items-center justify-between gap-4'>
										<div className='min-w-0'>
											<div className='flex items-baseline gap-2'>
												<span className='truncate font-medium'>{key.name}</span>
												<span className='shrink-0 font-mono text-xs text-muted-foreground'>{key.prefix}&hellip;</span>
											</div>
											<div className='mt-0.5 text-xs text-muted-foreground'>
												Created {ago(key.createdAt)}. {key.lastUsedAt ? `Last used ${ago(key.lastUsedAt)}.` : 'Never used.'}
											</div>
										</div>
										<Button
											type='button'
											variant='ghost'
											size='sm'
											disabled={revoking}
											onClick={() => setConfirmingId(key.id)}
											className='shrink-0 text-muted-foreground hover:text-destructive'
										>
											Revoke
										</Button>
									</div>
								)}
							</li>
						))}
					</ul>
				)}

				<form onSubmit={handleCreate} className='flex gap-2'>
					<Input
						aria-label='Key name'
						placeholder='Name, e.g. Claude Code on laptop'
						value={name}
						maxLength={60}
						disabled={creating}
						onChange={e => setName(e.target.value)}
					/>
					<StatusButton type='submit' status={createFetcher.state} disabled={!name.trim() || creating} className='shrink-0'>
						Create key
					</StatusButton>
				</form>
			</CardContent>
		</Card>
	)
}

function NewKeyPanel({ created, onDismiss }: { created: CreatedKey; onDismiss: () => void }) {
	const [copied, setCopied] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (!copied) return
		const t = setTimeout(() => setCopied(false), 2000)
		return () => clearTimeout(t)
	}, [copied])

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(created.key)
			setCopied(true)
		} catch {
			// Clipboard blocked (permissions, insecure context): select the text so Cmd+C still works.
			inputRef.current?.select()
		}
	}

	return (
		<div role='status' className='rounded-lg border border-amber-400/40 bg-amber-400/10 p-4'>
			<div className='flex items-start justify-between gap-4'>
				<div>
					<p className='font-medium text-amber-100'>Key created for {created.name}</p>
					<p className='mt-0.5 text-xs text-amber-200/80'>Shown once. Copy it now, it disappears when you close this.</p>
				</div>
				<Button
					type='button'
					variant='ghost'
					size='sm'
					onClick={onDismiss}
					className='shrink-0 text-amber-200 hover:bg-amber-400/15 hover:text-amber-100'
				>
					Done
				</Button>
			</div>
			<div className='mt-3 flex gap-2'>
				<Input
					ref={inputRef}
					readOnly
					value={created.key}
					aria-label='New API key'
					onFocus={e => e.currentTarget.select()}
					className='bg-background font-mono text-xs'
				/>
				<Button type='button' variant='outline' onClick={copy} className='w-24 shrink-0'>
					{copied ? (
						<>
							<Check className='h-4 w-4' aria-hidden /> Copied
						</>
					) : (
						<>
							<Copy className='h-4 w-4' aria-hidden /> Copy
						</>
					)}
				</Button>
			</div>
		</div>
	)
}

function RevokeConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [onCancel])

	return (
		<div className='flex flex-wrap items-center justify-between gap-3'>
			<div className='min-w-0'>
				<span className='font-medium'>Revoke {name}?</span>
				<div className='mt-0.5 text-xs text-muted-foreground'>Anything using it stops working straight away.</div>
			</div>
			<div className='flex shrink-0 gap-2'>
				<Button type='button' variant='ghost' size='sm' onClick={onCancel}>
					Cancel
				</Button>
				<Button type='button' variant='destructive' size='sm' autoFocus onClick={onConfirm}>
					Revoke key
				</Button>
			</div>
		</div>
	)
}
