import { useNavigate } from 'react-router-dom'
import type { Initiative } from '../../data/types'
import { Button } from '../ui/Button'
import { useAnalytics } from '../../analytics/AnalyticsContext'

/**
 * Mobile support CTA: fires support_tap, then routes to the handoff
 * interstitial. On the kiosk surface this is replaced by the QR handoff —
 * the transaction always belongs on the alum's phone.
 */
export function SupportCta({ initiative }: { initiative: Initiative }) {
  const navigate = useNavigate()
  const { track } = useAnalytics()

  return (
    <Button
      size="lg"
      onClick={() => {
        track('support_tap', {
          initiative_id: initiative.id,
          entity_id: initiative.linked_entity_id,
        })
        navigate(`/m/handoff/${initiative.id}`)
      }}
    >
      Support this
    </Button>
  )
}
