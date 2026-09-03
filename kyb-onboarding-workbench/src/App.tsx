import { CaseDetailView } from './views/CaseDetailView'
import { ConsoleView } from './views/ConsoleView'
import { ParcelView } from './views/ParcelView'
import { TriageView } from './views/TriageView'
import { Button, DemoBox, Select } from './components/ui'
import { useDispatch, useStore } from './state/Store'

function Tab({ active, testId, onClick, children }: { active: boolean; testId: string; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`-mb-px border-b-2 px-1 pb-3 pt-3 text-sm ${active ? 'border-accent-600 font-medium text-ink-900' : 'border-transparent text-ink-600 hover:text-ink-900'}`}
    >
      {children}
    </button>
  )
}

export default function App() {
  const s = useStore()
  const dispatch = useDispatch()
  const view = s.view
  const orgs = Object.values(s.orgs)

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center gap-8 px-6">
          <span className="py-3 text-sm font-semibold">KYB Onboarding Workbench</span>
          <nav className="flex gap-5">
            <Tab active={view.kind === 'console' || view.kind === 'case'} testId="nav-console" onClick={() => dispatch({ type: 'demo/switchPerson', personId: null })}>
              Cases
            </Tab>
            <Tab active={view.kind === 'triage'} testId="nav-triage" onClick={() => dispatch({ type: 'nav', view: { kind: 'triage' } })}>
              New case
            </Tab>
          </nav>
          <DemoBox className="ml-auto flex items-center gap-2 px-2 py-1">
            <span className="font-medium text-warn-600">Demo</span>
            <label className="flex items-center gap-1">
              view as
              <Select
                data-testid="person-switcher"
                className="h-7"
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
            <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'reset' })}>
              Reset
            </Button>
          </DemoBox>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-6 py-8">
        {view.kind === 'console' && <ConsoleView />}
        {view.kind === 'triage' && <TriageView />}
        {view.kind === 'case' && <CaseDetailView caseId={view.caseId} />}
        {view.kind === 'parcel' && <ParcelView personId={view.personId} caseId={view.caseId} />}
      </main>
    </div>
  )
}
