import type { Initiative } from '../../data/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

/**
 * The boundary, made unmistakable: Rocket surfaces the appeal, Syracuse's
 * own giving platform takes the gift. No payment ever touches Rocket.
 */
export function HandoffInterstitial({
  initiative,
  onContinue,
  onBack,
}: {
  initiative: Initiative
  onContinue: () => void
  onBack: () => void
}) {
  return (
    <Card className="p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-500">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
        </svg>
      </div>
      <h1 className="display-stat mt-4 text-xl font-bold text-rust-900">
        You’re heading to Syracuse’s giving page
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        “{initiative.title}” is a Syracuse Athletics campaign. Your gift is
        made on the university’s own giving platform —{' '}
        <span className="font-semibold text-ink-900">
          Rocket never handles your gift.
        </span>
      </p>
      <div className="mt-3 rounded-lg bg-paper px-3 py-2 text-xs text-ink-500">
        {initiative.giving_platform_url}
      </div>
      <div className="mt-5 space-y-2">
        <Button size="lg" onClick={onContinue}>
          Continue to giving page
        </Button>
        <Button size="lg" variant="ghost" onClick={onBack}>
          Go back
        </Button>
      </div>
    </Card>
  )
}
