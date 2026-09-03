import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import type { CaseStatus, ItemStatus, ParcelStatus } from '../model/types'

export type Tone = 'grey' | 'accent' | 'ok' | 'warn'

const TONE_CLASS: Record<Tone, string> = {
  grey: 'bg-ink-100 text-ink-600',
  accent: 'bg-accent-100 text-accent-600',
  ok: 'bg-ok-100 text-ok-600',
  warn: 'bg-warn-100 text-warn-600',
}

/** Filled chip: a state. */
export function Chip({ tone = 'grey', children, testId }: { tone?: Tone; children: ReactNode; testId?: string }) {
  return (
    <span data-testid={testId} className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  )
}

/** Outlined badge: a classification, deliberately colourless so it never competes with state. */
export function Badge({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <span data-testid={testId} className="inline-block rounded border border-ink-200 px-1.5 py-0.5 text-xs text-ink-600 whitespace-nowrap">
      {children}
    </span>
  )
}

export function itemTone(status: ItemStatus): Tone {
  if (status === 'accepted') return 'ok'
  if (status === 'more_info_needed') return 'warn'
  if (status === 'in_review' || status === 'provided') return 'accent'
  return 'grey'
}

export function parcelTone(status: ParcelStatus): Tone {
  if (status === 'complete') return 'ok'
  if (status === 'submitted') return 'accent'
  return 'grey'
}

export function caseTone(status: CaseStatus): Tone {
  if (status === 'funded' || status === 'approved') return 'ok'
  if (status === 'more_info_needed') return 'warn'
  if (status === 'in_review') return 'accent'
  return 'grey'
}

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'md' }

export function Button({ variant = 'secondary', size = 'md', className = '', ...props }: ButtonProps) {
  const base = `inline-flex items-center gap-1 rounded border font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`
  const sizing = size === 'sm' ? 'h-7 px-2 text-xs' : 'h-9 px-3 text-sm'
  const look =
    variant === 'primary'
      ? 'border-accent-600 bg-accent-600 text-white hover:opacity-90'
      : variant === 'ghost'
        ? 'border-transparent text-accent-600 hover:bg-accent-100'
        : 'border-ink-200 bg-white text-ink-900 hover:bg-ink-100'
  return <button type="button" className={`${base} ${sizing} ${look} ${className}`} {...props} />
}

/** A styled file picker; the native input stays for the browser, hidden for the eye. */
export function UploadButton({ onFile, testId }: { onFile: (name: string) => void; testId?: string }) {
  return (
    <label className={`inline-flex h-7 cursor-pointer items-center rounded border border-ink-200 bg-white px-2 text-xs font-medium hover:bg-ink-100 ${FOCUS}`}>
      Upload file
      <input type="file" className="sr-only" data-testid={testId} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0].name)} />
    </label>
  )
}

export function PageHeader({ eyebrow, title, description, meta, actions }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-6">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs text-ink-400">{eyebrow}</div>}
        <h1 className="text-xl font-semibold leading-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-600">{description}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-600">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({ title, children, actions, className = '', dense = false }: { title: string; children: ReactNode; actions?: ReactNode; className?: string; dense?: boolean }) {
  return (
    <section className={`rounded border border-ink-200 bg-white ${className}`}>
      <header className="flex h-10 items-center justify-between border-b border-ink-200 px-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {actions}
      </header>
      <div className={dense ? 'p-2' : 'p-4'}>{children}</div>
    </section>
  )
}

export function Modal({ title, onClose, children, width = 'max-w-2xl' }: { title: string; onClose: () => void; children: ReactNode; width?: string }) {
  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-8" onClick={onClose}>
      <div role="dialog" aria-label={title} className={`w-full ${width} rounded border border-ink-200 bg-white`} onClick={(e) => e.stopPropagation()}>
        <header className="flex h-12 items-center justify-between border-b border-ink-200 px-5">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-8 rounded border border-ink-200 bg-white px-2 text-sm ${FOCUS} ${props.className ?? ''}`} />
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  )
}

export const inputClass = `h-8 w-full rounded border border-ink-200 bg-white px-2 text-sm ${FOCUS}`

export function Muted({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`text-xs text-ink-400 ${className}`}>{children}</span>
}

/** Demo-only chrome gets one look everywhere so it can never be mistaken for product. */
export function DemoBox({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded border border-dashed border-warn-600/40 bg-warn-100/40 text-xs text-ink-600 ${className}`}>{children}</div>
}

export function ProgressBar({ done, total, testId }: { done: number; total: number; testId?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="h-1.5 w-full rounded bg-ink-200" data-testid={testId} data-pct={pct}>
      <div className="h-1.5 rounded bg-ok-600" style={{ width: `${pct}%` }} />
    </div>
  )
}
