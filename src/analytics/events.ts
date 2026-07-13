import type { Surface } from '../data/types'

/**
 * The analytics contract for the whole prototype lives in this file:
 * every event name, the event shape, and the funnel stages built from
 * them. The bus that carries these events is ./store.ts. Together they
 * are the entire "analytics system" — no SDK, no backend, no config.
 */

/** Every instrumented moment in the flow, in funnel order. */
export type EventName =
  | 'link_open' // mobile entry: the texted highlight link was tapped
  | 'kiosk_open' // kiosk entry: the wall opened at an event moment
  | 'team_view' // recognition content viewed, either surface
  | 'initiative_view' // a campaign's detail screen was opened
  | 'support_tap' // the commitment moment: "Support this"
  // Deliberately the LAST event Rocket sees: the gift happens on the
  // school's platform, which attributes it via the UTM source tag.
  | 'handoff_initiated'

export interface AnalyticsEvent {
  id: string
  name: EventName
  /** Which surface fired it — stamped automatically from the route namespace. */
  surface: Surface
  entity_id?: string
  initiative_id?: string
  ts: number
}

export interface FunnelStageDef {
  key: string
  label: string
  events: EventName[]
}

/**
 * The funnel deliberately ends at handoff_initiated. Rocket never sees the
 * gift; completions are attributed by the school's platform via the UTM
 * source tag. The entry stage is split by surface (link_open vs kiosk_open)
 * because the two surfaces reach entirely different audiences.
 */
export const FUNNEL_STAGES: FunnelStageDef[] = [
  { key: 'open', label: 'Open', events: ['link_open', 'kiosk_open'] },
  { key: 'team_view', label: 'Team page', events: ['team_view'] },
  { key: 'initiative_view', label: 'Initiative', events: ['initiative_view'] },
  { key: 'support_tap', label: 'Support tap', events: ['support_tap'] },
  { key: 'handoff', label: 'Handoff', events: ['handoff_initiated'] },
]
