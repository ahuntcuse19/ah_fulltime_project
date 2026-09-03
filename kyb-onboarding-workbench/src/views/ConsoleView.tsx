import { Button, Chip, caseTone } from '../components/ui'
import { CASE_STATUS_LABEL, TIER_LABEL } from '../model/catalog'
import { blockedOn, daysOpen, outstanding } from '../model/selectors'
import { useDispatch, useStore } from '../state/Store'
import { MetricsStrip } from './MetricsStrip'

export function ConsoleView() {
  const s = useStore()
  const dispatch = useDispatch()
  const cases = Object.values(s.cases).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))

  return (
    <div className="space-y-6">
      <MetricsStrip />
      <div className="overflow-x-auto rounded border border-ink-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-ink-100 text-left text-xs uppercase tracking-wide text-ink-600">
            <tr>
              <th className="px-4 py-2">Organisation</th>
              <th className="px-4 py-2">Tier</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Days open</th>
              <th className="px-4 py-2">Outstanding</th>
              <th className="px-4 py-2">Blocked on</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const blocked = blockedOn(s, c.id)
              return (
                <tr key={c.id} data-testid="case-row" className="border-t border-ink-200 align-top">
                  <td className="px-4 py-3">
                    <button type="button" className="font-medium text-accent-600 hover:underline" onClick={() => dispatch({ type: 'nav', view: { kind: 'case', caseId: c.id } })}>
                      {s.orgs[c.organizationId].legalName}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Chip tone={c.tier === 'complex' ? 'warn' : c.tier === 'standard' ? 'accent' : 'grey'} testId="tier-badge">
                      {TIER_LABEL[c.tier]}
                    </Chip>
                  </td>
                  <td className="px-4 py-3">
                    <Chip tone={caseTone(c.status)} testId="case-status">
                      {CASE_STATUS_LABEL[c.status]}
                    </Chip>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{daysOpen(s, c)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {outstanding(s, c.id)} of {c.itemIds.length}
                  </td>
                  <td className="px-4 py-3" data-testid="blocked-on">
                    {blocked.length === 0 ? (
                      <span className="text-ink-400">Nobody</span>
                    ) : (
                      <ul className="space-y-1">
                        {blocked.map((b) => (
                          <li key={b.personId} className="flex items-center gap-2">
                            <span>{b.name}</span>
                            <Button size="sm" data-testid={`nudge-${b.personId}`} onClick={() => dispatch({ type: 'case/nudge', caseId: c.id, personId: b.personId })}>
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
      <Button onClick={() => dispatch({ type: 'nav', view: { kind: 'triage' } })}>New case (triage)</Button>
    </div>
  )
}
