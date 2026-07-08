import type { EventName } from '../data/types'

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
