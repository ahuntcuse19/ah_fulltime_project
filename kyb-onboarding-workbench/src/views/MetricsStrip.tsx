import { ROLE_LABEL, TIER_LABEL } from '../model/catalog'
import { metrics } from '../model/selectors'
import { useStore } from '../state/Store'

function Tile({ value, label, sub, testId }: { value: string; label: string; sub: string; testId: string }) {
  return (
    <div data-testid={testId} className="rounded border border-ink-200 bg-white px-4 py-3">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm">{label}</div>
      <div className="text-xs text-ink-400">{sub}</div>
    </div>
  )
}

export function MetricsStrip() {
  const s = useStore()
  const m = metrics(s)
  const open = m.stalls ? m.stalls.initial + m.stalls.reRequest : 0
  return (
    <div className="grid grid-cols-4 gap-4">
      <Tile
        testId="metric-median"
        value={m.medianDays === null ? 'n/a' : String(m.medianDays)}
        label="Median days to first transaction"
        sub={m.medianDays === null ? 'no funded cases yet' : `${m.fundedCount} funded case${m.fundedCount === 1 ? '' : 's'}`}
      />
      <Tile
        testId="metric-completion"
        value={m.completionByTier.map((t) => `${TIER_LABEL[t.tier]} ${t.done}/${t.total}`).join(' · ') || 'n/a'}
        label="Completion by tier"
        sub="approved or funded / total"
      />
      <Tile
        testId="metric-stalls"
        value={m.stalls ? `initial ${m.stalls.initial} · re-request ${m.stalls.reRequest}` : 'n/a'}
        label="Where stalls happen"
        sub={m.stalls ? `${open} open case${open === 1 ? '' : 's'}` : 'no open cases'}
      />
      <Tile
        testId="metric-blocked"
        value={m.blockedByRole ? m.blockedByRole.map((b) => `${ROLE_LABEL[b.role]} ${b.count}`).join(' · ') : 'n/a'}
        label="Blocked on, by role"
        sub={m.blockedByRole ? `${m.blockedTotal} people` : 'nobody is blocked'}
      />
    </div>
  )
}
