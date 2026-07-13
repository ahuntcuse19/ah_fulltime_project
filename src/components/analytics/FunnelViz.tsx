import { computeFunnel } from '../../analytics/funnel'
import type { AnalyticsEvent } from '../../analytics/events'

/**
 * Surface-split funnel: five labeled stages, raw counts only. No
 * percentages and no drop-off math — with one demo session there is no
 * aggregate to summarize, and inventing one would undercut the point.
 * The funnel ends at handoff: Rocket reports intent, the school
 * attributes completions.
 */
export function FunnelViz({ events }: { events: AnalyticsEvent[] }) {
  const stages = computeFunnel(events)
  const max = Math.max(1, ...stages.map((s) => s.total))

  return (
    <div>
      <div className="space-y-2">
        {stages.map((stage) => (
          <div key={stage.key} className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-right text-[11px] font-medium text-white/70">
              {stage.label}
            </div>
            <div className="h-5 flex-1 overflow-hidden rounded bg-white/10">
              <div
                className="flex h-full transition-[width] duration-500"
                style={{ width: `${(stage.total / max) * 100}%` }}
              >
                {stage.mobile > 0 && (
                  <div
                    className="h-full bg-orange-500"
                    style={{ flex: stage.mobile }}
                    title={`mobile: ${stage.mobile}`}
                  />
                )}
                {stage.kiosk > 0 && (
                  <div
                    className="h-full bg-sky-400"
                    style={{ flex: stage.kiosk }}
                    title={`kiosk: ${stage.kiosk}`}
                  />
                )}
              </div>
            </div>
            <div className="display-stat w-8 shrink-0 text-right text-xs font-bold text-white">
              {stage.total}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 text-[10px] text-white/50">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-orange-500" /> mobile
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-sky-400" /> kiosk
        </span>
      </div>
      <p className="mt-2 border-t border-white/10 pt-2 text-[10px] leading-relaxed text-white/40">
        Funnel ends here by design — the gift happens on the school’s
        platform, attributed via the UTM source tag. Rocket reports intent;
        the school closes the loop.
      </p>
    </div>
  )
}
