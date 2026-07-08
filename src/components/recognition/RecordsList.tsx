import type { TeamRecord } from '../../data/types'
import { Card } from '../ui/Card'

export function RecordsList({ records }: { records: TeamRecord[] }) {
  if (records.length === 0) return null
  return (
    <section className="px-5" aria-labelledby="records-heading">
      <h2
        id="records-heading"
        className="display-stat text-sm font-bold text-ink-500"
      >
        Records
      </h2>
      <Card className="mt-2 divide-y divide-paper-dim">
        {records.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-ink-900">{r.label}</div>
              <div className="text-xs text-ink-500">{r.year}</div>
            </div>
            <div className="display-stat text-lg font-bold text-rust-900">
              {r.value}
            </div>
          </div>
        ))}
      </Card>
    </section>
  )
}
