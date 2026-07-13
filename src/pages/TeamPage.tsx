import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getEntity,
  getInitiativesForEntity,
  getTeamsExcept,
  demoAlum,
} from '../data'
import { TeamHero } from '../components/recognition/TeamHero'
import { RecordsList } from '../components/recognition/RecordsList'
import { RosterList } from '../components/recognition/RosterList'
import { Card } from '../components/ui/Card'
import { InitiativeModule } from '../components/giving/InitiativeModule'
import { useTrackOnMount } from '../analytics/useTrackOnMount'

export default function TeamPage() {
  const { teamId = '' } = useParams()
  const navigate = useNavigate()
  const entity = getEntity(teamId)
  useTrackOnMount('team_view', { entity_id: teamId }, entity !== undefined)

  if (!entity) {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <p className="text-ink-500">That page isn’t on the wall yet.</p>
        <Link to="/" className="mt-2 inline-block font-semibold text-orange-600">
          Back to start
        </Link>
      </main>
    )
  }

  const isDemoAlumsTeam = demoAlum.teams.includes(entity.id)
  const teamInitiatives = getInitiativesForEntity(entity.id)
  const otherTeams = getTeamsExcept(entity.id)

  return (
    <div className="min-h-dvh bg-paper sm:bg-paper-dim">
      <main className="mx-auto max-w-md bg-paper pb-12 sm:min-h-dvh sm:shadow-card">
        <TeamHero entity={entity} />
        <div className="mt-6 space-y-6">
          <RecordsList records={entity.records} />
          <RosterList
            roster={entity.roster}
            highlightName={isDemoAlumsTeam ? demoAlum.name : undefined}
          />
          {/* Renders only when the school runs a campaign for THIS team;
              teams without one show recognition content and nothing else. */}
          {teamInitiatives.length > 0 && (
            <section className="px-5" aria-labelledby="giving-heading">
              <h2
                id="giving-heading"
                className="display-stat text-sm font-bold text-ink-500"
              >
                Keep it going
              </h2>
              <div className="mt-2 space-y-3">
                {teamInitiatives.map((initiative) => (
                  <InitiativeModule
                    key={initiative.id}
                    initiative={initiative}
                    onOpen={() => navigate(`/m/initiative/${initiative.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {otherTeams.length > 0 && (
            <section className="px-5" aria-labelledby="more-teams-heading">
              <h2
                id="more-teams-heading"
                className="display-stat text-sm font-bold text-ink-500"
              >
                More from the Wall
              </h2>
              <div className="mt-2 space-y-2">
                {otherTeams.map((team) => (
                  <Card key={team.id} className="overflow-hidden">
                    <Link
                      to={`/m/team/${team.id}`}
                      className="flex items-center justify-between p-4 transition-colors hover:bg-paper/60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-rust-900">
                          {team.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-500">
                          {team.years}
                        </span>
                      </span>
                      <span className="display-stat shrink-0 text-xs font-bold text-orange-600">
                        View →
                      </span>
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
