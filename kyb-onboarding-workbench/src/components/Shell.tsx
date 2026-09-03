// Two shells that mirror Stable Sea Terminal: the sidebar app for operators
// and the centred card layout from sign-in for customers. Plain-text
// wordmark only; no logo mark, no artwork.
import type { ReactNode } from 'react'
import { Button, DemoBox, Select } from './ui'
import { useDispatch, useStore } from '../state/Store'

function Icon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

const ICONS = {
  home: 'M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z',
  onboarding: 'M9 5h6M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1zM6 5h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM9 12l2 2 4-4',
  markets: 'M3 20h18M5 16l4-5 4 3 6-8',
  treasury: 'M3 10l9-6 9 6M5 10v9M9 10v9M15 10v9M19 10v9M3 19h18',
  portfolio: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  transactions: 'M7 7h13l-3-3M17 17H4l3 3',
  accounting: 'M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM9 7h6M9 11h2M13 11h2M9 15h2M13 15h2',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7M12 17h.01',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 20a2 2 0 0 0 4 0',
  user: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 18.5c1.5-2 3.5-3 6-3s4.5 1 6 3',
}

export function DemoCluster() {
  const s = useStore()
  const dispatch = useDispatch()
  const orgs = Object.values(s.orgs)
  return (
    <DemoBox className="flex items-center gap-2 px-2 py-1">
      <span className="font-medium text-warn-600">Demo</span>
      <label className="flex items-center gap-1">
        view as
        <Select data-testid="person-switcher" className="h-7" value={s.activePersonId ?? ''} onChange={(e) => dispatch({ type: 'demo/switchPerson', personId: e.target.value || null })}>
          <option value="">Operator</option>
          {orgs.map((org) => (
            <optgroup key={org.id} label={org.legalName}>
              {org.personIds.map((pid) => (
                <option key={pid} value={pid}>
                  {s.people[pid].name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </label>
      <Button size="sm" variant="ghost" data-testid="nav-triage" onClick={() => dispatch({ type: 'nav', view: { kind: 'triage' } })}>
        New case
      </Button>
      <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'reset' })}>
        Reset
      </Button>
    </DemoBox>
  )
}

function Wordmark() {
  return (
    <span className="text-[15px] font-semibold tracking-tight">
      Stable Sea <span className="font-normal text-ink-600">Terminal</span>
    </span>
  )
}

const NAV: { key: keyof typeof ICONS; label: string; live?: boolean }[] = [
  { key: 'home', label: 'Home' },
  { key: 'onboarding', label: 'Onboarding', live: true },
  { key: 'markets', label: 'Capital Markets' },
  { key: 'treasury', label: 'Treasury' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'accounting', label: 'Accounting' },
]

export function OperatorShell({ children }: { children: ReactNode }) {
  const dispatch = useDispatch()
  return (
    <div className="flex min-h-screen">
      <aside className="w-[232px] shrink-0 border-r border-ink-200 bg-white px-3 py-4">
        <div className="px-3 pb-6 pt-1">
          <Wordmark />
        </div>
        <nav className="space-y-0.5">
          {NAV.map((n) => (
            <button
              key={n.key}
              type="button"
              data-testid={n.live ? 'nav-console' : undefined}
              title={n.live ? undefined : 'Not part of this prototype'}
              disabled={!n.live}
              onClick={() => n.live && dispatch({ type: 'demo/switchPerson', personId: null })}
              className={`flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm ${n.live ? 'bg-accent-100 font-medium text-accent-600' : 'text-ink-400 hover:bg-ink-100 disabled:cursor-default disabled:hover:bg-transparent'}`}
            >
              <Icon d={ICONS[n.key]} />
              {n.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 px-8">
          <label className="flex h-9 w-[320px] items-center gap-2 rounded-[10px] border border-ink-200 bg-white px-3 text-sm text-ink-400">
            <Icon d={ICONS.search} />
            <input className="w-full bg-transparent outline-none placeholder:text-ink-400" placeholder="Search…" readOnly aria-label="Search (inert in this prototype)" />
          </label>
          <div className="ml-auto flex items-center gap-3">
            <DemoCluster />
            <span className="flex items-center gap-3 text-ink-600" aria-hidden="true">
              <Icon d={ICONS.help} />
              <Icon d={ICONS.bell} />
              <Icon d={ICONS.user} />
            </span>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-8 pb-12 pt-2">
          <div className="mx-auto max-w-[1180px]">{children}</div>
        </main>
      </div>
    </div>
  )
}

export function CustomerShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen">
      <header className="flex h-16 items-center justify-between px-8">
        <Wordmark />
        <div className="flex items-center gap-4">
          <DemoCluster />
          <span className="text-sm text-ink-600">← Back to stablesea.com</span>
        </div>
      </header>
      <main className={`mx-auto px-6 pb-16 pt-6 ${wide ? 'max-w-[860px]' : 'max-w-[1100px]'}`}>{children}</main>
    </div>
  )
}
