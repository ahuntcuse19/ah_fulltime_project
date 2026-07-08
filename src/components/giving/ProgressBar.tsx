import { formatMoney, formatAsOfDate, pctToGoal } from '../../lib/format'

interface ProgressBarProps {
  goal: number
  raised?: number
  donorCount?: number
  lastUpdated?: string
  size?: 'sm' | 'lg'
}

/**
 * Progress figures are optional, school-supplied fields. With data: filled
 * bar + raised/goal + "as of" stamp. Without: a labeled goal chip — no
 * empty bars, no fake zeros, never looks broken or stale.
 */
export function ProgressBar({
  goal,
  raised,
  donorCount,
  lastUpdated,
  size = 'sm',
}: ProgressBarProps) {
  if (raised === undefined) {
    return (
      <div className="flex items-center gap-2">
        <span className="display-stat rounded-md bg-orange-100 px-2 py-1 text-[11px] font-bold text-rust-900">
          Goal: {formatMoney(goal)}
        </span>
        <span className="text-xs text-ink-500">Designated fund · Syracuse Athletics</span>
      </div>
    )
  }

  const pct = pctToGoal(raised, goal)
  const big = size === 'lg'

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span
          className={`display-stat font-bold text-rust-900 ${big ? 'text-2xl' : 'text-base'}`}
        >
          {formatMoney(raised)}
          <span className={`font-semibold text-ink-500 ${big ? 'text-sm' : 'text-xs'}`}>
            {' '}
            of {formatMoney(goal)}
          </span>
        </span>
        <span className={`display-stat font-bold text-orange-600 ${big ? 'text-sm' : 'text-xs'}`}>
          {pct}%
        </span>
      </div>
      <div
        className={`mt-1.5 overflow-hidden rounded-full bg-paper-dim ${big ? 'h-2.5' : 'h-1.5'}`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-orange-500 transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`mt-1.5 flex items-center justify-between text-ink-500 ${big ? 'text-xs' : 'text-[11px]'}`}>
        <span>{donorCount !== undefined ? `${donorCount} donors` : ' '}</span>
        {lastUpdated && <span>as of {formatAsOfDate(lastUpdated)}</span>}
      </div>
    </div>
  )
}
