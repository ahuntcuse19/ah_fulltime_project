import type { AnalyticsEvent } from '../../data/types'

const time = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

export function EventLog({ events }: { events: AnalyticsEvent[] }) {
  const recent = [...events].reverse().slice(0, 12)

  if (recent.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-white/40">
        No events yet — click through the flow and watch them fire.
      </p>
    )
  }

  return (
    <ul className="space-y-1">
      {recent.map((e) => (
        <li
          key={e.id}
          className="flex items-center gap-2 rounded-md px-2 py-1 font-mono text-[11px] text-white/80 animate-event-pulse"
        >
          <span
            className={`display-stat w-12 shrink-0 rounded px-1 py-0.5 text-center text-[9px] font-bold ${
              e.surface === 'kiosk'
                ? 'bg-sky-400/20 text-sky-300'
                : 'bg-orange-500/20 text-orange-500'
            }`}
          >
            {e.surface}
          </span>
          <span className="flex-1 truncate">
            {e.name}
            {e.initiative_id && (
              <span className="text-white/40"> · {e.initiative_id}</span>
            )}
            {!e.initiative_id && e.entity_id && (
              <span className="text-white/40"> · {e.entity_id}</span>
            )}
          </span>
          <span className="shrink-0 text-white/30">{time.format(e.ts)}</span>
        </li>
      ))}
    </ul>
  )
}
