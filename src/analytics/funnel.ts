import { FUNNEL_STAGES, type AnalyticsEvent } from './events'

export interface FunnelStage {
  key: string
  label: string
  total: number
  mobile: number
  kiosk: number
}

/**
 * Raw event counts per stage, split by surface. Production analytics would
 * dedupe by session; for a live demo, raw counts make every click visible.
 */
export function computeFunnel(events: AnalyticsEvent[]): FunnelStage[] {
  return FUNNEL_STAGES.map((stage) => {
    const matching = events.filter((e) =>
      (stage.events as string[]).includes(e.name),
    )
    return {
      key: stage.key,
      label: stage.label,
      total: matching.length,
      mobile: matching.filter((e) => e.surface === 'mobile').length,
      kiosk: matching.filter((e) => e.surface === 'kiosk').length,
    }
  })
}
