import type { Initiative, Surface } from '../data/types'

/**
 * Builds the source-tagged URL for the school's giving platform. In this
 * prototype the "external" page is the internal /give route; the UTM params
 * are the real payload — they're how the school's platform attributes the
 * gift back to Rocket's recognition surface. The funnel deliberately ends
 * at handoff: Rocket reports intent, the school closes the loop.
 */
export function buildHandoffParams(
  initiative: Initiative,
  surface: Surface,
): URLSearchParams {
  return new URLSearchParams({
    utm_source: 'rocket_recognition',
    utm_medium: surface === 'kiosk' ? 'kiosk_qr' : 'mobile_highlight',
    utm_campaign: initiative.id,
  })
}

export function buildHandoffPath(
  initiative: Initiative,
  surface: Surface,
): string {
  return `/give/${initiative.id}?${buildHandoffParams(initiative, surface)}`
}

/**
 * Absolute URL a kiosk QR code encodes: the mobile initiative page on the
 * deployed host, tagged so attribution survives the kiosk→phone hop.
 */
export function buildQrUrl(initiative: Initiative): string {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#/m/initiative/${initiative.id}?src=kiosk_qr`
}
