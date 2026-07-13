import type { AnalyticsEvent, EventName } from './events'
import type { Surface } from '../data/types'

/**
 * The event bus, in its entirety: a module-scope array plus a listener
 * set. Deliberately in-memory only — no backend, no storage, no SDK — so
 * a refresh starts an empty session and the overlay can only ever show
 * clicks that actually happened in this one. Honest by construction.
 */
type Listener = () => void

let events: AnalyticsEvent[] = []
const listeners = new Set<Listener>()
let counter = 0

export interface TrackInput {
  name: EventName
  surface: Surface
  entity_id?: string
  initiative_id?: string
}

export function track(input: TrackInput): void {
  const event: AnalyticsEvent = {
    ...input,
    id: `evt-${counter++}`,
    ts: Date.now(),
  }
  events = [...events, event]
  listeners.forEach((l) => l())
}

export function clearEvents(): void {
  events = []
  listeners.forEach((l) => l())
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot(): AnalyticsEvent[] {
  return events
}
