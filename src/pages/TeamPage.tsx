import { Link, useNavigate, useParams } from 'react-router-dom'
import { getEntity, getInitiativesForEntity, demoAlum } from '../data'
import { TeamHero } from '../components/recognition/TeamHero'
import { RecordsList } from '../components/recognition/RecordsList'
import { RosterList } from '../components/recognition/RosterList'
import { InitiativeModule } from '../components/giving/InitiativeModule'
import { useTrackOnMount } from '../analytics/useTrackOnMount'

export default function TeamPage() {
  const { teamId = '' } = useParams()
  const navigate = useNavigate()
  const entity = getEntity(teamId)
  useTrackOnMount('team_view', { entity_id: teamId })

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
        </div>
      </main>
    </div>
  )
}
