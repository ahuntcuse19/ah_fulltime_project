import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import type { CaseStatus, ItemStatus, ParcelStatus } from '../model/types'

export type Tone = 'grey' | 'accent' | 'ok' | 'warn'

const TONE_CLASS: Record<Tone, string> = {
  grey: 'bg-ink-100 text-ink-600',
  accent: 'bg-accent-100 text-accent-600',
  ok: 'bg-ok-100 text-ok-600',
  warn: 'bg-warn-100 text-warn-600',
}

export function Chip({ tone = 'grey', children, testId }: { tone?: Tone; children: ReactNode; testId?: string }) {
  return (
    <span data-testid={testId} className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASS[tone]}`}>
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

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'md' }

export function Button({ variant = 'secondary', size = 'md', className = '', ...props }: ButtonProps) {
  const base = 'inline-flex items-center rounded border font-medium disabled:cursor-not-allowed disabled:opacity-40'
  const sizing = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1.5 text-sm'
  const look =
    variant === 'primary'
      ? 'border-accent-600 bg-accent-600 text-white hover:opacity-90'
      : variant === 'ghost'
        ? 'border-transparent text-accent-600 hover:bg-accent-100'
        : 'border-ink-200 bg-white text-ink-900 hover:bg-ink-100'
  return <button type="button" className={`${base} ${sizing} ${look} ${className}`} {...props} />
}

export function Panel({ title, children, actions, className = '' }: { title: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`rounded border border-ink-200 bg-white ${className}`}>
      <header className="flex items-center justify-between border-b border-ink-200 px-4 py-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Modal({ title, onClose, children, width = 'max-w-2xl' }: { title: string; onClose: () => void; children: ReactNode; width?: string }) {
  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-8" onClick={onClose}>
      <div role="dialog" aria-label={title} className={`w-full ${width} rounded border border-ink-200 bg-white`} onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
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
  return <select {...props} className={`rounded border border-ink-200 bg-white px-2 py-1 text-sm ${props.className ?? ''}`} />
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

export const inputClass = 'w-full rounded border border-ink-200 bg-white px-2 py-1 text-sm'

export function Muted({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`text-xs text-ink-400 ${className}`}>{children}</span>
}
