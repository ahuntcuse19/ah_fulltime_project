export type Surface = 'mobile' | 'kiosk'

export interface TeamRecord {
  label: string
  value: string
  year: string
}

export interface Entity {
  id: string
  type: 'team' | 'era' | 'person' | 'program'
  name: string
  years: string
  photoSeed: string
  tagline: string
  roster: string[]
  records: TeamRecord[]
}

/**
 * Mirrors an EXISTING school campaign or designated fund. Rocket never
 * creates funds — every initiative points at a giving destination the
 * school already administers, via giving_platform_url.
 */
export interface Initiative {
  id: string
  linked_entity_id: string
  title: string
  story: string
  photoSeed: string
  goal_amount: number
  /** Optional, school-supplied. When absent the module renders goal + story + CTA only. */
  raised_amount?: number
  donor_count?: number
  /** ISO date of the school's last progress update; rendered as an "as of" stamp. */
  last_updated?: string
  end_date?: string
  giving_platform_url: string
}

export interface Alum {
  id: string
  name: string
  grad_year: number
  phone_frame_message: string
  teams: string[]
}

export type EventName =
  | 'link_open'
  | 'kiosk_open'
  | 'team_view'
  | 'initiative_view'
  | 'support_tap'
  | 'handoff_initiated'

export interface AnalyticsEvent {
  id: string
  name: EventName
  surface: Surface
  entity_id?: string
  initiative_id?: string
  ts: number
}
