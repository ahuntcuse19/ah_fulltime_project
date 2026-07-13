import { Link, useParams } from 'react-router-dom'
import { getInitiative, getEntity } from '../data'
import { PlaceholderImage } from '../components/ui/PlaceholderImage'
import { Card } from '../components/ui/Card'
import { KindBadge, KIND_META } from '../components/giving/KindBadge'
import { ProgressBar } from '../components/giving/ProgressBar'
import { SocialProof } from '../components/giving/SocialProof'
import { SupportCta } from '../components/giving/SupportCta'
import { useTrackOnMount } from '../analytics/useTrackOnMount'

export default function InitiativeDetailPage() {
  const { initiativeId = '' } = useParams()
  const initiative = getInitiative(initiativeId)
  useTrackOnMount(
    'initiative_view',
    { initiative_id: initiativeId },
    initiative !== undefined,
  )

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

  const entity = getEntity(initiative.linked_entity_id)

  return (
    <div className="min-h-dvh bg-paper sm:bg-paper-dim">
      <main className="mx-auto max-w-md bg-paper pb-12 sm:min-h-dvh sm:shadow-card">
        <div className="relative">
          <PlaceholderImage seed={initiative.photoSeed} className="rounded-b-3xl" />
          {entity && (
            <Link
              to={`/m/team/${entity.id}`}
              className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm"
            >
              ← {entity.name}
            </Link>
          )}
        </div>

        <div className="space-y-5 px-5 pt-4">
          <div>
            <KindBadge kind={initiative.kind} />
            <h1 className="display-stat mt-2 text-2xl font-bold leading-tight text-rust-900">
              {initiative.title}
            </h1>
            <p className="mt-1 text-xs text-ink-500">
              Run by Syracuse Athletics{entity ? ` · supports ${entity.name}` : ''}
            </p>
          </div>

          <Card className="p-4">
            <ProgressBar
              goal={initiative.goal_amount}
              raised={initiative.raised_amount}
              donorCount={initiative.donor_count}
              lastUpdated={initiative.last_updated}
              kind={initiative.kind}
              size="lg"
            />
          </Card>

          <p className="text-[15px] leading-relaxed text-ink-900">
            {initiative.story}
          </p>

          <SocialProof
            donorCount={initiative.donor_count}
            fallbackText={`Every gift is directed to this ${
              KIND_META[initiative.kind].noun
            } by Syracuse Athletics.`}
          />

          <div className="pt-1">
            <SupportCta initiative={initiative} />
            <p className="mt-2.5 rounded-xl bg-orange-100 px-4 py-3 text-center text-xs font-semibold leading-relaxed text-orange-600">
              Gifts are made on Syracuse’s giving platform. Rocket surfaces
              the campaign — it never processes payments.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
