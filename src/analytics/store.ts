import type { AnalyticsEvent, EventName, Surface } from '../data/types'

const STORAGE_KEY = 'ag.events.v1'

type Listener = () => void

function load(): AnalyticsEvent[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : []
  } catch {
    return []
  }
}

function persist(events: AnalyticsEvent[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch {
    // private mode / quota — the demo still works, it just won't survive refresh
  }
}

let events: AnalyticsEvent[] = load()
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
    id: `evt-${Date.now()}-${counter++}`,
    ts: Date.now(),
  }
  events = [...events, event]
  persist(events)
  listeners.forEach((l) => l())
}

export function clearEvents(): void {
  events = []
  persist(events)
  listeners.forEach((l) => l())
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot(): AnalyticsEvent[] {
  return events
}
