import { Link, useNavigate, useParams } from 'react-router-dom'
import { getInitiative } from '../data'
import { HandoffInterstitial } from '../components/giving/HandoffInterstitial'
import { useAnalytics } from '../analytics/AnalyticsContext'
import { useSurface } from '../surface/SurfaceContext'
import { buildHandoffPath } from '../lib/handoff'

export default function HandoffPage() {
  const { initiativeId = '' } = useParams()
  const navigate = useNavigate()
  const { track } = useAnalytics()
  const surface = useSurface()
  const initiative = getInitiative(initiativeId)

  if (!initiative) {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <p className="text-ink-500">This campaign isn’t available.</p>
        <Link to="/" className="mt-2 inline-block font-semibold text-orange-600">
          Back to start
        </Link>
      </main>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper-dim p-5">
      <div className="w-full max-w-md">
        <HandoffInterstitial
          initiative={initiative}
          onContinue={() => {
            // The last event Rocket ever sees. Completion is attributed by
            // the school's platform via the UTM source tag.
            track('handoff_initiated', {
              initiative_id: initiative.id,
              entity_id: initiative.linked_entity_id,
            })
            navigate(buildHandoffPath(initiative, surface))
          }}
          onBack={() => navigate(-1)}
        />
      </div>
    </div>
  )
}
