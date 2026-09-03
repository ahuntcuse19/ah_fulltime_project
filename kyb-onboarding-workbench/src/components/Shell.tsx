// One top-bar shell for both worlds. Type and colour follow the Terminal
// tokens; there is no wordmark, logo, sidebar or artwork.
import type { ReactNode } from 'react'
import { Button, DemoBox, Select } from './ui'
import { useDispatch, useStore } from '../state/Store'

function Tab({ active, testId, onClick, children }: { active: boolean; testId: string; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`-mb-px border-b-2 px-1 pb-4 pt-5 text-sm ${active ? 'border-accent-600 font-medium text-ink-900' : 'border-transparent text-ink-600 hover:text-ink-900'}`}
    >
      {children}
    </button>
  )
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
      <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'reset' })}>
        Reset
      </Button>
    </DemoBox>
  )
}

export function AppShell({ children, mode, wide = false }: { children: ReactNode; mode: 'operator' | 'customer'; wide?: boolean }) {
  const s = useStore()
  const dispatch = useDispatch()
  const view = s.view
  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-[1180px] items-center gap-8 px-8">
          <span className="py-4 text-sm font-semibold">Onboarding Workbench</span>
          {mode === 'operator' && (
            <nav className="flex gap-5">
              <Tab active={view.kind === 'console' || view.kind === 'case'} testId="nav-console" onClick={() => dispatch({ type: 'demo/switchPerson', personId: null })}>
                Cases
              </Tab>
              <Tab active={view.kind === 'triage'} testId="nav-triage" onClick={() => dispatch({ type: 'nav', view: { kind: 'triage' } })}>
                New case
              </Tab>
            </nav>
          )}
          <div className="ml-auto py-3">
            <DemoCluster />
          </div>
        </div>
      </header>
      <main className={`mx-auto px-8 pb-16 pt-8 ${wide ? 'max-w-[860px]' : 'max-w-[1180px]'}`}>{children}</main>
    </div>
  )
}
