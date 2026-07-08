import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getInitiative } from '../data'
import { formatMoney } from '../lib/format'

/**
 * Plays the part of the school's giving platform (GiveCampus-style).
 * Deliberately styled in a foreign visual language — white, green, serif —
 * so the boundary between Rocket and the school's platform is visceral.
 * Fires NO analytics events: Rocket's funnel ends at handoff, and this
 * page proves it. The UTM panel shows the attribution the school's
 * platform receives.
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
      <main className="mx-auto max-w-xl p-8 font-serif">
        <p>Campaign not found.</p>
      </main>
    )
  }

  return (
    <div className="min-h-dvh bg-white font-serif text-stone-800">
      {/* simulated-page ribbon */}
      <div className="bg-stone-800 px-4 py-2 text-center font-sans text-xs text-stone-200">
        Simulated external page — in production this is the school’s existing
        campaign on its own giving platform.
      </div>

      {/* foreign chrome */}
      <header className="border-b-4 border-ext-green bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <div className="text-xl font-bold tracking-tight text-ext-green-dark">
            GiveOrange
          </div>
          <div className="font-sans text-xs text-stone-500">
            Syracuse University Advancement
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8">
        <p className="font-sans text-xs uppercase tracking-widest text-ext-green">
          Athletics · Rowing
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-stone-900">
          {initiative.title}
        </h1>

        {initiative.raised_amount !== undefined ? (
          <div className="mt-6 rounded border border-stone-200 p-5">
            <div className="text-2xl font-bold text-ext-green-dark">
              {formatMoney(initiative.raised_amount)}
              <span className="text-base font-normal text-stone-500">
                {' '}
                raised of {formatMoney(initiative.goal_amount)} goal
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full bg-ext-green"
                style={{
                  width: `${Math.min(100, (initiative.raised_amount / initiative.goal_amount) * 100)}%`,
                }}
              />
            </div>
            {initiative.donor_count !== undefined && (
              <p className="mt-2 font-sans text-sm text-stone-500">
                {initiative.donor_count} donors
              </p>
            )}
          </div>
        ) : (
          <div className="mt-6 rounded border border-stone-200 p-5">
            <div className="text-2xl font-bold text-ext-green-dark">
              {formatMoney(initiative.goal_amount)}
              <span className="text-base font-normal text-stone-500"> goal</span>
            </div>
          </div>
        )}

        <p className="mt-6 leading-relaxed">{initiative.story}</p>

        <div className="mt-8 grid grid-cols-3 gap-3 font-sans">
          {[50, 100, 250].map((amt) => (
            <button
              key={amt}
              className="cursor-pointer rounded border-2 border-ext-green py-3 font-bold text-ext-green-dark transition-colors hover:bg-ext-green hover:text-white"
            >
              ${amt}
            </button>
          ))}
        </div>
        <button className="mt-3 w-full cursor-pointer rounded bg-ext-green py-4 font-sans text-lg font-bold text-white transition-colors hover:bg-ext-green-dark">
          Give now
        </button>
        <p className="mt-2 text-center font-sans text-xs text-stone-400">
          Demo only — no payment is collected anywhere in this prototype.
        </p>

        {/* the attribution payload, made visible for the demo */}
        {utmEntries.length > 0 && (
          <aside className="mt-10 rounded border border-dashed border-stone-300 bg-stone-50 p-4 font-sans">
            <h2 className="text-xs font-bold uppercase tracking-wide text-stone-500">
              What this platform received from Rocket
            </h2>
            <dl className="mt-2 space-y-1 text-sm">
              {utmEntries.map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="w-32 text-stone-400">{k}</dt>
                  <dd className="font-mono text-xs leading-5 text-stone-700">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs leading-relaxed text-stone-500">
              The school’s platform attributes completed gifts to the
              recognition surface via these tags. Rocket reports intent up to
              handoff; the school closes the loop.
            </p>
          </aside>
        )}

        <div className="mt-8 text-center font-sans text-sm">
          <Link to="/" className="text-stone-400 underline hover:text-stone-600">
            ← Back to the prototype start
          </Link>
        </div>
      </main>
    </div>
  )
}
