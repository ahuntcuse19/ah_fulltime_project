import type { Initiative } from './types'

// Seeded relative to "now" so the demo's "as of" stamp always reads fresh,
// the way a recently-updated campaign would.
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export const initiatives: Initiative[] = [
  {
    // Fresh progress data: exercises the full progress-bar + "as of" rendering.
    id: 'record-board',
    linked_entity_id: 'lw8-2014',
    kind: 'live_campaign',
    title: 'Restore the Boathouse Record Board',
    story:
      'The painted record board at Ten Eyck has tracked every Syracuse crew since 1936 — and forty seasons of lake air have caught up with it. This campaign restores the original board and adds the 2010s panels, so the 2014 Lightweight 8+ takes its place next to the crews it chased.',
    photoSeed: 'record-board',
    goal_amount: 25000,
    raised_amount: 18450,
    donor_count: 142,
    last_updated: daysAgo(4),
    end_date: daysAgo(-45),
    giving_platform_url: 'givecampus.example.com/syracuse/record-board',
  },
  {
    // The standing designated fund, program-level. Not surfaced on team
    // pages: the module renders only where the school runs a campaign
    // for that specific team.
    id: 'rowing-excellence',
    linked_entity_id: 'rowing-program',
    kind: 'designated_fund',
    title: 'Rowing Excellence Fund',
    story:
      'The designated fund that keeps Syracuse crews on the water — shell maintenance, travel to Eastern Sprints and the IRA, and coaching support. Directed entirely to rowing, administered by Syracuse Athletics.',
    photoSeed: 'rowing-excellence',
    goal_amount: 100000,
    giving_platform_url: 'givecampus.example.com/syracuse/rowing-excellence',
  },
  {
    // Goal-only: a real campaign whose school-supplied figures were never
    // published — the graceful-degradation state, reachable on a team page.
    id: 'erg-room',
    linked_entity_id: 'womens4-2019',
    kind: 'live_campaign',
    title: 'Erg Room Renewal',
    story:
      'Winter training happens indoors. This campaign replaces two dozen aging ergometers and re-floors the erg room at Ten Eyck before the fall season.',
    photoSeed: 'erg-room',
    goal_amount: 40000,
    giving_platform_url: 'givecampus.example.com/syracuse/erg-room',
  },
]
