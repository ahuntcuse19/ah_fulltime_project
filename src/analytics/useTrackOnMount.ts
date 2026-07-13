import { useEffect, useRef } from 'react'
import { useAnalytics } from './AnalyticsContext'
import type { EventName } from './events'

/**
 * Fires a view event once per mounted screen. The ref guard keeps React 18
 * StrictMode's double-invoked effects from double-counting the funnel.
 * `enabled` gates tracking to content that actually rendered — a mistyped
 * or stale deep link shows the not-found state and must not count as a
 * view, or the simulated funnel inflates with views that never happened.
 */
export function useTrackOnMount(
  name: EventName,
  ids: { entity_id?: string; initiative_id?: string } = {},
  enabled = true,
) {
  const { track } = useAnalytics()
  const firedFor = useRef<string | null>(null)
  const key = `${name}:${ids.entity_id ?? ''}:${ids.initiative_id ?? ''}`

  useEffect(() => {
    if (!enabled || firedFor.current === key) return
    firedFor.current = key
    track(name, ids)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])
}
