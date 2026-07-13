import type { Initiative } from '../../data/types'
import { Card } from '../ui/Card'
import { PlaceholderImage } from '../ui/PlaceholderImage'
import { KindBadge } from './KindBadge'
import { ProgressBar } from './ProgressBar'

/**
 * The embedded giving module: an initiative the school is ALREADY running
 * for this specific team, placed at the moment of affinity. Rocket surfaces
 * it; the school's platform takes the gift.
 */
export function InitiativeModule({
  initiative,
  onOpen,
}: {
  initiative: Initiative
  onOpen: () => void
}) {
  return (
    <Card className="overflow-hidden">
      <button
        onClick={onOpen}
        className="block w-full cursor-pointer text-left transition-colors hover:bg-paper/60"
      >
        <div className="flex gap-3 p-4">
          <PlaceholderImage
            seed={initiative.photoSeed}
            aspect="1/1"
            className="h-20 w-20 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <KindBadge kind={initiative.kind} />
            <h3 className="mt-1.5 text-[15px] font-bold leading-snug text-rust-900">
              {initiative.title}
            </h3>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-500">
              {initiative.story}
            </p>
          </div>
        </div>
        <div className="px-4 pb-4">
          <ProgressBar
            goal={initiative.goal_amount}
            raised={initiative.raised_amount}
            donorCount={initiative.donor_count}
            lastUpdated={initiative.last_updated}
            kind={initiative.kind}
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-ink-500">Syracuse Athletics campaign</span>
            <span className="display-stat text-xs font-bold text-orange-600">
              Learn more →
            </span>
          </div>
        </div>
      </button>
    </Card>
  )
}
