import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import type { CaseStatus, ItemStatus, ParcelStatus } from '../model/types'

export type Tone = 'grey' | 'accent' | 'ok' | 'warn'

const TONE_CLASS: Record<Tone, string> = {
  grey: 'bg-ink-100 text-ink-600',
  accent: 'bg-accent-100 text-accent-600',
  ok: 'bg-ok-100 text-ok-600',
  warn: 'bg-warn-100 text-warn-600',
}

/** Filled pill: a state. Green pills match the Terminal's delta pills. */
export function Chip({ tone = 'grey', children, testId }: { tone?: Tone; children: ReactNode; testId?: string }) {
  return (
    <span data-testid={testId} className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  )
}

/** Outlined badge: a classification, deliberately colourless. */
export function Badge({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <span data-testid={testId} className="inline-block rounded-md border border-ink-200 px-2 py-0.5 text-xs text-ink-600 whitespace-nowrap">
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

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'olive'; size?: 'sm' | 'md' | 'lg' }

export function Button({ variant = 'secondary', size = 'md', className = '', ...props }: ButtonProps) {
  const base = `inline-flex items-center justify-center gap-1 rounded-[10px] font-medium whitespace-nowrap disabled:cursor-not-allowed ${FOCUS}`
  const sizing = size === 'sm' ? 'h-7 px-2.5 text-xs' : size === 'lg' ? 'h-11 px-5 text-sm' : 'h-9 px-3.5 text-sm'
  const look =
    variant === 'primary'
      ? 'bg-accent-600 text-white hover:opacity-90 disabled:opacity-40'
      : variant === 'olive'
        ? 'bg-olive-700 text-white hover:opacity-90 disabled:bg-ink-400 disabled:text-white'
        : variant === 'ghost'
          ? 'text-accent-600 hover:bg-accent-100 disabled:opacity-40'
          : 'border border-ink-200 bg-white text-ink-900 hover:bg-ink-100 disabled:opacity-40'
  return <button type="button" className={`${base} ${sizing} ${look} ${className}`} {...props} />
}

export function UploadButton({ onFile, testId }: { onFile: (name: string) => void; testId?: string }) {
  return (
    <label className={`inline-flex h-8 cursor-pointer items-center rounded-[10px] border border-ink-200 bg-white px-3 text-xs font-medium hover:bg-ink-100 ${FOCUS}`}>
      Upload file
      <input type="file" className="sr-only" data-testid={testId} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0].name)} />
    </label>
  )
}

/** The Terminal card: white, 16px radius, soft shadow, no border. */
export const cardClass = 'rounded-[16px] bg-white shadow-card'

export function Card({ children, className = '', testId }: { children: ReactNode; className?: string; testId?: string }) {
  return (
    <section data-testid={testId} className={`${cardClass} ${className}`}>
      {children}
    </section>
  )
}

export function PageHeader({ eyebrow, title, description, meta, actions }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs text-ink-400">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold leading-tight text-olive-900">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-600">{description}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-600">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({ title, children, actions, className = '', dense = false }: { title: string; children: ReactNode; actions?: ReactNode; className?: string; dense?: boolean }) {
  return (
    <section className={`${cardClass} ${className}`}>
      <header className="flex h-12 items-center justify-between px-5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {actions}
      </header>
      <div className={dense ? 'px-3 pb-3' : 'px-5 pb-5'}>{children}</div>
    </section>
  )
}

export function Modal({ title, onClose, children, width = 'max-w-2xl' }: { title: string; onClose: () => void; children: ReactNode; width?: string }) {
  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-3 md:p-8" onClick={onClose}>
      <div role="dialog" aria-label={title} className={`w-full ${width} ${cardClass}`} onClick={(e) => e.stopPropagation()}>
        <header className="flex h-14 items-center justify-between px-6">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </header>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-9 rounded-[10px] border border-ink-200 bg-white px-2 text-sm ${FOCUS} ${props.className ?? ''}`} />
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-400">{hint}</span>}
    </label>
  )
}

export const inputClass = `h-11 w-full rounded-[10px] border border-ink-200 bg-white px-3.5 text-sm placeholder:text-ink-400 ${FOCUS}`

export function Muted({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`text-xs text-ink-400 ${className}`}>{children}</span>
}

export function DemoBox({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[10px] border border-dashed border-warn-600/40 bg-warn-100/40 text-xs text-ink-600 ${className}`}>{children}</div>
}

export function ProgressBar({ done, total, testId }: { done: number; total: number; testId?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="h-1.5 w-full rounded bg-ink-200" data-testid={testId} data-pct={pct}>
      <div className="h-1.5 rounded bg-ok-600" style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Phases. `current` is 1-based; steps before it are done. */
export function Stepper({
  steps,
  current,
  orientation = 'horizontal',
  flag,
  testId,
}: {
  steps: string[]
  current: number
  orientation?: 'horizontal' | 'vertical'
  flag?: string
  testId?: string
}) {
  const state = (i: number) => (i + 1 < current ? 'done' : i + 1 === current ? 'current' : 'upcoming')
  const dot = (st: string) =>
    st === 'done'
      ? 'bg-olive-900 text-white'
      : st === 'current'
        ? 'border-2 border-accent-600 bg-white text-accent-600'
        : 'border border-ink-200 bg-white text-ink-400'
  if (orientation === 'vertical') {
    return (
      <ol data-testid={testId} className="space-y-6">
        {steps.map((label, i) => {
          const st = state(i)
          return (
            <li key={label} data-testid="step" data-state={st} className="relative flex items-start gap-3">
              {i < steps.length - 1 && <span className="absolute left-[13px] top-7 h-6 w-px bg-ink-200" />}
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${dot(st)}`}>{st === 'done' ? '✓' : i + 1}</span>
              <div className="pt-1">
                <div className={`text-sm ${st === 'current' ? 'font-semibold text-ink-900' : st === 'done' ? 'text-ink-900' : 'text-ink-400'}`}>{label}</div>
                {st === 'current' && flag && <div className="mt-0.5 text-xs text-warn-600">{flag}</div>}
              </div>
            </li>
          )
        })}
      </ol>
    )
  }
  return (
    <ol data-testid={testId} className="flex items-center overflow-x-auto">
      {steps.map((label, i) => {
        const st = state(i)
        return (
          <li key={label} data-testid="step" data-state={st} className="flex items-center">
            <div className="flex items-center gap-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${dot(st)}`}>{st === 'done' ? '✓' : i + 1}</span>
              <div>
                <div className={`text-sm whitespace-nowrap ${st === 'current' ? 'font-semibold text-ink-900' : st === 'done' ? 'text-ink-900' : 'text-ink-400'}`}>{label}</div>
                {st === 'current' && flag && <div className="text-xs text-warn-600">{flag}</div>}
              </div>
            </div>
            {i < steps.length - 1 && <span className={`mx-4 h-px w-10 ${st === 'done' ? 'bg-olive-900' : 'bg-ink-200'}`} />}
          </li>
        )
      })}
    </ol>
  )
}

/** Compact pipeline for table cells: four dots and the current label. */
export function MiniPipeline({ steps, current, flag, testId }: { steps: string[]; current: number; flag?: string; testId?: string }) {
  return (
    <div data-testid={testId} className="flex items-center gap-2">
      <span className="flex items-center gap-1">
        {steps.map((s, i) => (
          <span key={s} className={`h-2 w-2 rounded-full ${i + 1 < current ? 'bg-olive-900' : i + 1 === current ? 'bg-accent-600' : 'bg-ink-200'}`} />
        ))}
      </span>
      <span className="text-sm">{steps[current - 1]}</span>
      {flag && <Chip tone="warn">{flag}</Chip>}
    </div>
  )
}
