import { Link, useParams } from 'react-router-dom'
import { getEntity, getInitiativesForEntity, demoAlum } from '../data'
import { TeamHero } from '../components/recognition/TeamHero'
import { RecordsList } from '../components/recognition/RecordsList'
import { RosterList } from '../components/recognition/RosterList'
import { useTrackOnMount } from '../analytics/useTrackOnMount'

export default function TeamPage() {
  const { teamId = '' } = useParams()
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
          {/* Giving module lands here in milestone 3 */}
          {teamInitiatives.length > 0 && (
            <p className="px-5 text-xs text-ink-300">
              {teamInitiatives.length} linked initiative(s) — module arrives in
              milestone 3
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
