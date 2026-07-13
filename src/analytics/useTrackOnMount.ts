import { useEffect, useRef } from 'react'
import { useAnalytics } from './AnalyticsContext'
import type { EventName } from './events'

/**
 * Fires a view event once per mounted screen. The ref guard keeps React 18
 * StrictMode's double-invoked effects from double-counting the funnel.
 */
export function useTrackOnMount(
  name: EventName,
  ids: { entity_id?: string; initiative_id?: string } = {},
) {
  const { track } = useAnalytics()
  const firedFor = useRef<string | null>(null)
  const key = `${name}:${ids.entity_id ?? ''}:${ids.initiative_id ?? ''}`

  useEffect(() => {
    if (firedFor.current === key) return
    firedFor.current = key
    track(name, ids)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
