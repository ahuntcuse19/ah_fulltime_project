import { Badge, Button, Chip, PageHeader, caseTone } from '../components/ui'
import { CASE_STATUS_LABEL, TIER_LABEL } from '../model/catalog'
import { blockedOn, daysOpen, outstanding } from '../model/selectors'
import { useDispatch, useStore } from '../state/Store'
import { MetricsStrip } from './MetricsStrip'

export function ConsoleView() {
  const s = useStore()
  const dispatch = useDispatch()
  const cases = Object.values(s.cases).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))

  return (
    <div>
      <PageHeader
        title="Cases"
        description="Every onboarding in flight, who it is waiting on, and one button to chase them."
        actions={
          <Button variant="primary" onClick={() => dispatch({ type: 'nav', view: { kind: 'triage' } })}>
            New case
          </Button>
        }
      />
      <div className="space-y-6">
        <MetricsStrip />
        <div className="overflow-x-auto rounded border border-ink-200 bg-white">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Organisation</th>
                <th className="px-4 py-2.5 font-medium">Tier</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Days open</th>
                <th className="px-4 py-2.5 text-right font-medium">Outstanding</th>
                <th className="px-4 py-2.5 font-medium">Blocked on</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const blocked = blockedOn(s, c.id)
                const open = () => dispatch({ type: 'nav', view: { kind: 'case', caseId: c.id } })
                return (
                  <tr key={c.id} data-testid="case-row" className="cursor-pointer border-t border-ink-200 align-top hover:bg-ink-100/60" onClick={open}>
                    <td className="px-4 py-3">
                      <button type="button" className="font-medium text-ink-900 hover:underline" onClick={open}>
                        {s.orgs[c.organizationId].legalName}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Badge testId="tier-badge">{TIER_LABEL[c.tier]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Chip tone={caseTone(c.status)} testId="case-status">
                        {CASE_STATUS_LABEL[c.status]}
                      </Chip>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{daysOpen(s, c)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {outstanding(s, c.id)} <span className="text-ink-400">of {c.itemIds.length}</span>
                    </td>
                    <td className="px-4 py-3" data-testid="blocked-on" onClick={(e) => e.stopPropagation()}>
                      {blocked.length === 0 ? (
                        <span className="text-ink-400">Nobody</span>
                      ) : (
                        <ul className="space-y-1">
                          {blocked.map((b) => (
                            <li key={b.personId} className="flex items-center justify-between gap-3">
                              <span>
                                {b.name} <span className="text-xs text-ink-400">{b.outstandingCount}</span>
                              </span>
                              <Button size="sm" variant="ghost" data-testid={`nudge-${b.personId}`} onClick={() => dispatch({ type: 'case/nudge', caseId: c.id, personId: b.personId })}>
                                Nudge
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
