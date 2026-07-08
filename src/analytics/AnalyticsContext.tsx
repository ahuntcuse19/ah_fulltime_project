import { useCallback, useSyncExternalStore } from 'react'
import { track, subscribe, getSnapshot } from './store'
import { useSurface } from '../surface/SurfaceContext'
import type { EventName } from '../data/types'

/**
 * Surface-stamped tracker: every event fired through this hook is
 * automatically attributed to the surface of the route namespace it
 * fired from.
 */
export function useAnalytics() {
  const surface = useSurface()
  const trackEvent = useCallback(
    (
      name: EventName,
      ids: { entity_id?: string; initiative_id?: string } = {},
    ) => {
      track({ name, surface, ...ids })
    },
    [surface],
  )
  return { track: trackEvent }
}

export function useAnalyticsEvents() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
