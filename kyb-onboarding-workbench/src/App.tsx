import { CaseDetailView } from './views/CaseDetailView'
import { ConsoleView } from './views/ConsoleView'
import { ParcelView } from './views/ParcelView'
import { TriageView } from './views/TriageView'
import { Button, Select } from './components/ui'
import { useDispatch, useStore } from './state/Store'

export default function App() {
  const s = useStore()
  const dispatch = useDispatch()
  const view = s.view
  const orgs = Object.values(s.orgs)

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center gap-6 px-6 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">KYB Onboarding Workbench</span>
            <span className="text-xs text-ink-400">prototype, seeded data</span>
          </div>
          <nav className="flex gap-1">
            <Button data-testid="nav-console" variant={view.kind === 'console' ? 'primary' : 'ghost'} size="sm" onClick={() => dispatch({ type: 'demo/switchPerson', personId: null })}>
              Console
            </Button>
            <Button data-testid="nav-triage" variant={view.kind === 'triage' ? 'primary' : 'ghost'} size="sm" onClick={() => dispatch({ type: 'nav', view: { kind: 'triage' } })}>
              Triage
            </Button>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-ink-600">
              <span className="rounded bg-warn-100 px-1.5 py-0.5 font-medium text-warn-600">Demo only</span>
              view as
              <Select
                data-testid="person-switcher"
                value={s.activePersonId ?? ''}
                onChange={(e) => dispatch({ type: 'demo/switchPerson', personId: e.target.value || null })}
              >
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
            <Button size="sm" onClick={() => dispatch({ type: 'reset' })}>
              Reset to seed
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-6 py-6">
        {view.kind === 'console' && <ConsoleView />}
        {view.kind === 'triage' && <TriageView />}
        {view.kind === 'case' && <CaseDetailView caseId={view.caseId} />}
        {view.kind === 'parcel' && <ParcelView personId={view.personId} caseId={view.caseId} />}
      </main>
    </div>
  )
}
