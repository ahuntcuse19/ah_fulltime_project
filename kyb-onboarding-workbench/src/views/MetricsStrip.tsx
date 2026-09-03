import type { ReactNode } from 'react'
import { ROLE_LABEL, TIER_LABEL } from '../model/catalog'
import { metrics } from '../model/selectors'
import { useStore } from '../state/Store'

function Tile({ value, label, sub, testId, children }: { value: string; label: string; sub?: string; testId: string; children?: ReactNode }) {
  return (
    <div data-testid={testId} className="rounded-[16px] bg-white px-5 py-4 shadow-card">
      <div className="text-xs text-ink-600">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold leading-none tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-400">{sub}</div>}
      {children && <div className="mt-2 space-y-0.5 text-xs text-ink-600">{children}</div>}
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{k}</span>
      <span className="font-mono tabular-nums">{v}</span>
    </div>
  )
}

export function MetricsStrip() {
  const s = useStore()
  const m = metrics(s)
  const open = m.stalls ? m.stalls.initial + m.stalls.reRequest : 0
  const doneAll = m.completionByTier.reduce((a, t) => a + t.done, 0)
  const totalAll = m.completionByTier.reduce((a, t) => a + t.total, 0)
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
      <Tile
        testId="metric-median"
        label="Median days to first transaction"
        value={m.medianDays === null ? 'n/a' : String(m.medianDays)}
        sub={m.medianDays === null ? 'no funded cases yet' : `${m.fundedCount} funded case${m.fundedCount === 1 ? '' : 's'}`}
      />
      <Tile testId="metric-completion" label="Completion by tier" value={totalAll ? `${doneAll} / ${totalAll}` : 'n/a'} sub="approved or funded / total">
        {m.completionByTier.map((t) => (
          <Row key={t.tier} k={TIER_LABEL[t.tier]} v={`${t.done} / ${t.total}`} />
        ))}
      </Tile>
      <Tile testId="metric-stalls" label="Where stalls happen" value={m.stalls ? String(open) : 'n/a'} sub={m.stalls ? `open case${open === 1 ? '' : 's'} with work outstanding` : 'no open cases'}>
        {m.stalls && (
          <>
            <Row k="At initial submission" v={String(m.stalls.initial)} />
            <Row k="At a re-request" v={String(m.stalls.reRequest)} />
          </>
        )}
      </Tile>
      <Tile testId="metric-blocked" label="Blocked on, by role" value={m.blockedByRole ? String(m.blockedTotal) : 'n/a'} sub={m.blockedByRole ? 'people with something outstanding' : 'nobody is blocked'}>
        {m.blockedByRole?.map((b) => (
          <Row key={b.role} k={ROLE_LABEL[b.role]} v={String(b.count)} />
        ))}
      </Tile>
    </div>
  )
}
