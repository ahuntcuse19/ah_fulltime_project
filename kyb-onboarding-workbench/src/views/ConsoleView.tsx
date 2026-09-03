import { Badge, Button, MiniPipeline, PageHeader, cardClass } from '../components/ui'
import { TIER_LABEL } from '../model/catalog'
import { CASE_PHASES, blockedOn, casePhase, daysOpen, outstanding } from '../model/selectors'
import { useDispatch, useStore } from '../state/Store'
import { MetricsStrip } from './MetricsStrip'

export function ConsoleView() {
  const s = useStore()
  const dispatch = useDispatch()
  const cases = Object.values(s.cases).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))

  return (
    <div>
      <PageHeader
        title="Onboarding"
        description="Every onboarding in flight, which phase it is in, who it is waiting on, and one button to chase them."
        actions={
          <Button variant="primary" onClick={() => dispatch({ type: 'nav', view: { kind: 'triage' } })}>
            + New case
          </Button>
        }
      />
      <div className="space-y-6">
        <MetricsStrip />
        <div className={`overflow-x-auto ${cardClass}`}>
          <table className="w-full text-sm">
            <thead className="hidden text-left text-xs uppercase tracking-wide text-ink-400 md:table-header-group">
              <tr>
                <th className="px-4 py-2.5 font-medium">Organisation</th>
                <th className="px-4 py-2.5 font-medium">Tier</th>
                <th className="px-4 py-2.5 font-medium">Phase</th>
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
                  <tr key={c.id} data-testid="case-row" className="block cursor-pointer border-t border-ink-100 p-4 align-top hover:bg-paper md:table-row md:p-0" onClick={open}>
                    <td className="block md:table-cell md:px-4 md:py-3">
                      <button type="button" className="text-base font-medium text-ink-900 hover:underline md:text-sm" onClick={open}>
                        {s.orgs[c.organizationId].legalName}
                      </button>
                    </td>
                    <td data-label="Tier" className="block py-1 md:table-cell md:px-4 md:py-3 before:mr-2 before:text-xs before:uppercase before:tracking-wide before:text-ink-400 before:content-[attr(data-label)] md:before:content-none">
                      <Badge testId="tier-badge">{TIER_LABEL[c.tier]}</Badge>
                    </td>
                    <td data-label="Phase" className="block py-1 md:table-cell md:px-4 md:py-3 before:mr-2 before:text-xs before:uppercase before:tracking-wide before:text-ink-400 before:content-[attr(data-label)] md:before:content-none">
                      <MiniPipeline steps={CASE_PHASES} {...casePhase(c)} testId="case-status" />
                    </td>
                    <td data-label="Days open" className="block py-1 md:table-cell md:px-4 md:py-3 before:mr-2 before:text-xs before:uppercase before:tracking-wide before:text-ink-400 before:content-[attr(data-label)] md:before:content-none font-mono tabular-nums md:text-right">{daysOpen(s, c)}</td>
                    <td data-label="Outstanding" className="block py-1 md:table-cell md:px-4 md:py-3 before:mr-2 before:text-xs before:uppercase before:tracking-wide before:text-ink-400 before:content-[attr(data-label)] md:before:content-none font-mono tabular-nums md:text-right">
                      {outstanding(s, c.id)} <span className="text-ink-400">of {c.itemIds.length}</span>
                    </td>
                    <td data-label="Blocked on" className="block py-1 md:table-cell md:px-4 md:py-3 before:mr-2 before:text-xs before:uppercase before:tracking-wide before:text-ink-400 before:content-[attr(data-label)] md:before:content-none md:before:hidden" data-testid="blocked-on" onClick={(e) => e.stopPropagation()}>
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
