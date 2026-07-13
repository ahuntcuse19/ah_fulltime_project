import { Link } from 'react-router-dom'

/**
 * Reviewer-facing: the pilot plan behind the prototype. Linked only from
 * the footer of the SMS entry screen — never from inside the alum-facing
 * flow, which stays in character. Fires no analytics events; reading
 * about the pilot is not a funnel step.
 */
export default function PilotPage() {
  return (
    <div className="min-h-dvh bg-paper">
      <main className="mx-auto max-w-xl px-5 py-10 sm:py-14">
        <Link
          to="/"
          className="text-xs font-semibold text-orange-600 hover:text-rust-700"
        >
          ← Back to the prototype
        </Link>

        <p className="display-stat mt-8 text-xs font-bold text-orange-600">
          About this prototype
        </p>
        <h1 className="display-stat mt-2 text-3xl font-bold leading-tight text-rust-900">
          What a 2-week pilot would tell us
        </h1>
        <p className="mt-3 text-xs text-ink-300">Updated: July 13, 2026</p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink-900">
          <p>
            <strong className="font-semibold">Hypothesis.</strong> Alumni are
            more likely to start a gift when the ask is (a) tied to the
            specific team or era they belonged to and (b) delivered at the
            moment they’re viewing their own recognition content — versus a
            general appeal. This prototype is the cheapest way to test that
            with one school before building anything permanent.
          </p>

          <p>
            <strong className="font-semibold">Pilot shape.</strong> One school
            that already texts its community through an existing, consented
            tool (many do). Two messages over two weeks, each linking an alum
            to their team’s page with a live fundraiser the school is already
            running. Rocket surfaces; the school’s existing giving page takes
            the gift.
          </p>

          <section>
            <h2 className="font-semibold">What we’d measure.</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Open → team view → fundraiser view → handoff rate, by message
              </li>
              <li>
                Gifts the school attributes to the surface via the tagged
                handoff link (the school closes the loop — Rocket never sees
                the transaction)
              </li>
              <li>
                Opt-out rate, because a channel that burns goodwill isn’t
                worth its conversion rate
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold">Riskiest assumptions, named.</h2>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>
                Reach with consent — the school can text alumni at all. Pilot
                precondition, not an afterthought.
              </li>
              <li>
                A live, designated fundraiser with its own page actually
                exists at the pilot school. Rocket never invents a fund.
              </li>
              <li>
                Someone at the school keeps goal/raised numbers fresh. The
                module degrades gracefully to goal + story if they don’t —
                but the pilot tells us how real this is.
              </li>
              <li>
                The affinity premium itself — the reason to run the pilot
                instead of debating it.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="font-semibold">
              Five questions I’d want answered by the school before day one.
            </h2>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>
                What fundraisers are live right now, and where does the money
                page actually live?
              </li>
              <li>
                How do you reach alumni today — email, social, texting — and
                what consent do you have?
              </li>
              <li>
                (To recent-grad alumni) When did you last give to your
                program, and what triggered it?
              </li>
              <li>
                (To recent-grad alumni) If this text arrived with your old
                team’s photo, what would make you tap versus delete?
              </li>
              <li>
                Who would own updating the fundraiser numbers, and how often
                — honestly?
              </li>
            </ol>
          </section>
        </div>
      </main>
    </div>
  )
}
