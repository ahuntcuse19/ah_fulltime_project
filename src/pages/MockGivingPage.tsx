import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getInitiative } from '../data'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/giving/ProgressBar'

/**
 * Plays the part of the school's giving platform (GiveCampus-style),
 * rendered in the same visual system as the rest of the demo. The
 * boundary is carried by the ribbon, the wordmark, and the microcopy
 * rather than a different look. Fires NO analytics events: Rocket's
 * funnel ends at handoff, and this page proves it. The UTM panel shows
 * the attribution the school's platform receives.
 */
export default function MockGivingPage() {
  const { initiativeId = '' } = useParams()
  const [params] = useSearchParams()
  const initiative = getInitiative(initiativeId)

  const utmEntries = ['utm_source', 'utm_medium', 'utm_campaign']
    .map((k) => [k, params.get(k)] as const)
    .filter(([, v]) => v !== null)

  if (!initiative) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <p className="text-ink-500">Campaign not found.</p>
      </main>
    )
  }

  return (
    <div className="min-h-dvh bg-paper-dim">
      {/* simulated-page ribbon */}
      <div className="bg-ink-900 px-4 py-2 text-center text-xs text-white/80">
        Simulated external page — in production this is the school’s existing
        campaign on its own giving platform.
      </div>

      <header className="border-b border-ink-300/30 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <div className="display-stat text-xl font-bold tracking-tight text-rust-900">
            GiveOrange
          </div>
          <div className="text-xs text-ink-500">
            Syracuse University Advancement
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8">
        <Card className="p-6 sm:p-8">
          <p className="display-stat text-xs font-bold tracking-widest text-orange-600">
            Athletics · Rowing
          </p>
          <h1 className="display-stat mt-2 text-3xl font-bold leading-tight text-rust-900">
            {initiative.title}
          </h1>

          <div className="mt-6 rounded-2xl bg-paper p-5">
            <ProgressBar
              goal={initiative.goal_amount}
              raised={initiative.raised_amount}
              donorCount={initiative.donor_count}
              lastUpdated={initiative.last_updated}
              size="lg"
            />
          </div>

          <p className="mt-6 leading-relaxed text-ink-900">
            {initiative.story}
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[50, 100, 250].map((amt) => (
              <button
                key={amt}
                className="cursor-pointer rounded-2xl border border-ink-300 bg-white py-3 font-bold text-rust-900 transition-colors hover:border-orange-600 hover:text-orange-600"
              >
                ${amt}
              </button>
            ))}
          </div>
          <button className="mt-3 w-full cursor-pointer rounded-2xl bg-orange-500 py-4 text-lg font-semibold text-white shadow-card transition-colors hover:bg-orange-600">
            Give now
          </button>
          <p className="mt-2.5 text-center text-xs text-ink-300">
            Demo only — no payment is collected anywhere in this prototype.
          </p>
        </Card>

        {/* the attribution payload, made visible for the demo */}
        {utmEntries.length > 0 && (
          <Card className="mt-6 border border-dashed border-ink-300 bg-paper p-5 shadow-none">
            <h2 className="display-stat text-xs font-bold text-ink-500">
              What this platform received from Rocket
            </h2>
            <dl className="mt-2 space-y-1 text-sm">
              {utmEntries.map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="w-32 text-ink-300">{k}</dt>
                  <dd className="font-mono text-xs leading-5 text-ink-900">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              The school’s platform attributes completed gifts to the
              recognition surface via these tags. Rocket reports intent up to
              handoff; the school closes the loop.
            </p>
          </Card>
        )}

        <div className="mt-8 text-center text-sm">
          <Link
            to="/"
            className="text-ink-500 underline transition-colors hover:text-orange-600"
          >
            ← Back to the prototype start
          </Link>
        </div>
      </main>
    </div>
  )
}
