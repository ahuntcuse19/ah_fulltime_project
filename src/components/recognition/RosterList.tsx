import { Card } from '../ui/Card'

/**
 * Roster with the demo alum highlighted — the payoff of the texted
 * highlight is finding yourself on the wall.
 */
export function RosterList({
  roster,
  highlightName,
}: {
  roster: string[]
  highlightName?: string
}) {
  if (roster.length === 0) return null
  return (
    <section className="px-5" aria-labelledby="roster-heading">
      <h2
        id="roster-heading"
        className="display-stat text-sm font-bold text-ink-500"
      >
        The Crew
      </h2>
      <Card className="mt-2 px-4 py-2">
        <ul className="divide-y divide-paper-dim">
          {roster.map((name) => {
            const isYou =
              highlightName !== undefined && name.includes(highlightName)
            return (
              <li
                key={name}
                className={`flex items-center justify-between py-2.5 text-sm ${
                  isYou ? 'font-bold text-navy-900' : 'text-ink-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`display-stat flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                      isYou
                        ? 'bg-orange-500 text-white'
                        : 'bg-paper-dim text-ink-500'
                    }`}
                    aria-hidden="true"
                  >
                    {name
                      .replace(/\(.*\)/, '')
                      .trim()
                      .split(' ')
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                  {name}
                </span>
                {isYou && (
                  <span className="display-stat rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                    That’s you
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </Card>
    </section>
  )
}
