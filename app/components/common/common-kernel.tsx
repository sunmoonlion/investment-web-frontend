'use client'

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
} from 'react'

export type DataColumn<Row> = {
  key: string
  header: string
  render(row: Row): React.ReactNode
}

export function DataTable<Row>({
  caption,
  rows,
  columns,
  rowKey,
  loading,
  error,
  emptyLabel,
  page,
  pageCount,
  onPageChange,
}: {
  caption: string
  rows: readonly Row[]
  columns: readonly DataColumn<Row>[]
  rowKey(row: Row): string
  loading?: boolean
  error?: string
  emptyLabel: string
  page: number
  pageCount: number
  onPageChange(page: number): void
}) {
  if (loading) return <div aria-busy="true">Loading…</div>
  if (error) return <div role="alert">{error}</div>
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-muted">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="px-3 py-2 font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={rowKey(row)} className="border-t">
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-2">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <nav className="flex items-center justify-end gap-3 border-t p-3" aria-label={`${caption} pagination`}>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        <span>{page} / {Math.max(pageCount, 1)}</span>
        <button type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </nav>
    </div>
  )
}

export type FormField = {
  name: string
  label: string
  type?: 'text' | 'email' | 'number' | 'textarea' | 'select'
  required?: boolean
  options?: readonly { label: string; value: string }[]
  validate?(value: string): string | null
}

export function SchemaForm({
  fields,
  submitLabel,
  pending,
  onSubmit,
}: {
  fields: readonly FormField[]
  submitLabel: string
  pending?: boolean
  onSubmit(values: Record<string, string>): void | Promise<void>
}) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>
        const nextErrors = Object.fromEntries(
          fields.flatMap((field) => {
            const value = values[field.name]?.trim() ?? ''
            const message = field.required && !value ? `${field.label} is required` : field.validate?.(value)
            return message ? [[field.name, message]] : []
          }),
        )
        setErrors(nextErrors)
        if (!Object.keys(nextErrors).length) void onSubmit(values)
      }}
    >
      {fields.map((field) => (
        <label key={field.name} className="block space-y-1">
          <span className="text-sm font-medium">{field.label}</span>
          {field.type === 'textarea' ? (
            <textarea className="w-full rounded-md border p-2" name={field.name} rows={4} />
          ) : field.type === 'select' ? (
            <select className="w-full rounded-md border p-2" name={field.name}>
              <option value="">Select…</option>
              {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ) : (
            <input className="w-full rounded-md border p-2" name={field.name} type={field.type ?? 'text'} />
          )}
          {errors[field.name] ? <span role="alert" className="text-destructive text-sm">{errors[field.name]}</span> : null}
        </label>
      ))}
      <button type="submit" disabled={pending} className="rounded-md border px-4 py-2 font-medium">
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}

export function ResourceDescription({
  title,
  items,
}: {
  title: string
  items: readonly { label: string; value: React.ReactNode }[]
}) {
  return (
    <section aria-labelledby="common-resource-title" className="rounded-lg border p-4">
      <h2 id="common-resource-title" className="font-semibold">{title}</h2>
      <dl className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item.label} className="grid grid-cols-[10rem_1fr] gap-3">
            <dt className="text-muted-foreground">{item.label}</dt>
            <dd>{item.value === null || item.value === undefined || item.value === '' ? '—' : item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

type FeedbackKind = 'success' | 'error' | 'info'
type FeedbackApi = { notify(kind: FeedbackKind, text: string): void }
const FeedbackContext = createContext<FeedbackApi | null>(null)

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<{ id: number; kind: FeedbackKind; text: string }[]>([])
  const notify = useCallback((kind: FeedbackKind, text: string) => {
    const id = Date.now()
    setMessages((current) => [...current, { id, kind, text }])
    setTimeout(() => setMessages((current) => current.filter((item) => item.id !== id)), 4000)
  }, [])
  const api = useMemo(() => ({ notify }), [notify])
  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="fixed right-4 bottom-4 space-y-2">
        {messages.map((message) => (
          <div key={message.id} data-kind={message.kind} className="rounded-md border bg-background px-4 py-3 shadow">
            {message.text}
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  )
}

export function useFeedback(): FeedbackApi {
  const api = useContext(FeedbackContext)
  if (!api) throw new Error('useFeedback must be used within FeedbackProvider')
  return api
}

export function AuditedActionDialog({
  triggerLabel,
  title,
  onConfirm,
}: {
  triggerLabel: string
  title: string
  onConfirm(reason: string): void | Promise<void>
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  return (
    <>
      <button type="button" className="rounded-md border px-3 py-2" onClick={() => setOpen(true)}>{triggerLabel}</button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby={id} className="w-full max-w-lg rounded-xl bg-background p-6 shadow-xl">
            <h2 id={id} className="text-lg font-semibold">{title}</h2>
            <label className="mt-4 block">
              <span className="text-sm font-medium">Audit reason</span>
              <textarea className="mt-1 w-full rounded-md border p-2" value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button
                type="button"
                disabled={reason.trim().length < 3}
                onClick={async () => {
                  await onConfirm(reason.trim())
                  setOpen(false)
                  setReason('')
                }}
              >
                Confirm
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}

export function ContractUpload({
  label,
  accept,
  maxBytes,
  onSelect,
}: {
  label: string
  accept: string
  maxBytes: number
  onSelect(file: File): void
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          if (!file) return
          if (file.size > maxBytes) {
            event.currentTarget.setCustomValidity(`File exceeds ${maxBytes} bytes`)
            event.currentTarget.reportValidity()
            return
          }
          event.currentTarget.setCustomValidity('')
          onSelect(file)
        }}
      />
    </label>
  )
}

export function MarkdownEditor({
  value,
  onChange,
}: {
  value: string
  onChange(value: string): void
}) {
  const safePreview = value.replace(/<[^>]*>/g, '')
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <textarea aria-label="Markdown source" className="min-h-40 rounded-md border p-3" value={value} onChange={(event) => onChange(event.target.value)} />
      <pre aria-label="Safe text preview" className="min-h-40 whitespace-pre-wrap rounded-md border p-3">{safePreview}</pre>
    </div>
  )
}

export function MetricChart({
  title,
  points,
}: {
  title: string
  points: readonly { label: string; value: number }[]
}) {
  const max = Math.max(1, ...points.map((point) => point.value))
  return (
    <figure aria-label={title} className="rounded-lg border p-4">
      <figcaption className="font-semibold">{title}</figcaption>
      <div className="mt-4 flex h-36 items-end gap-4">
        {points.map((point) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="bg-primary w-full rounded-t" style={{ height: `${Math.max(4, point.value / max * 100)}%` }} />
            <span className="text-xs">{point.label}</span>
          </div>
        ))}
      </div>
    </figure>
  )
}

export function ProgressBar({ label, value }: { label: string; value: number }) {
  const normalized = Math.max(0, Math.min(100, value))
  return (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span>{normalized}%</span></div>
      <div className="bg-muted mt-1 h-2 rounded"><div className="bg-primary h-2 rounded" style={{ width: `${normalized}%` }} /></div>
    </div>
  )
}
