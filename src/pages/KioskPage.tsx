import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DEMO_TEAM_ID,
  getEntity,
  getInitiative,
  getInitiativesForEntity,
} from '../data'
import { KioskFrame } from '../components/frames/KioskFrame'
import { PlaceholderImage } from '../components/ui/PlaceholderImage'
import { Badge } from '../components/ui/Badge'
import { ProgressBar } from '../components/giving/ProgressBar'
import { QrHandoff } from '../components/kiosk/QrHandoff'
import { TextMeLink } from '../components/kiosk/TextMeLink'
import { useTrackOnMount } from '../analytics/useTrackOnMount'
import { useAnalytics } from '../analytics/AnalyticsContext'
import { buildQrUrl } from '../lib/handoff'
import { formatMoney } from '../lib/format'

/**
 * The event-moment surface. Same recognition content, same initiative,
 * same boundary as mobile — but the handoff is a QR / "text me the link",
 * because the transaction belongs on the alum's phone.
 */
export default function KioskPage() {
  const { initiativeId } = useParams()
  return initiativeId ? (
    <KioskInitiative initiativeId={initiativeId} />
  ) : (
    <KioskTeam />
  )
}

function KioskTeam() {
  const navigate = useNavigate()
  const entity = getEntity(DEMO_TEAM_ID)!
  const initiatives = getInitiativesForEntity(entity.id)
  useTrackOnMount('kiosk_open', { entity_id: entity.id })
  useTrackOnMount('team_view', { entity_id: entity.id })

  return (
    <KioskFrame>
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* recognition column */}
        <div>
          <PlaceholderImage
            seed={entity.photoSeed}
            label="Ten Eyck Boathouse · Onondaga Lake"
            className="rounded-2xl"
          />
          <div className="mt-5 flex items-center gap-3">
            <Badge tone="orange">Wall of Records</Badge>
            <span className="text-sm text-white/60">{entity.years}</span>
          </div>
          <h1 className="display-stat mt-2 text-5xl font-bold">{entity.name}</h1>
          <p className="mt-2 text-white/60">{entity.tagline}</p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            {entity.records.map((r) => (
              <div
                key={r.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="display-stat text-2xl font-bold text-white">
                  {r.value}
                </div>
                <div className="mt-1 text-sm text-white/60">
                  {r.label} · {r.year}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* roster + giving column */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="display-stat text-sm font-bold text-white/60">
              The Crew
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-white/90">
              {entity.roster.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>

          {initiatives.slice(0, 1).map((initiative) => (
            <button
              key={initiative.id}
              onClick={() => navigate(`/kiosk/initiative/${initiative.id}`)}
              className="block w-full cursor-pointer rounded-2xl bg-white p-5 text-left text-ink-900 shadow-card transition-transform hover:scale-[1.01]"
            >
              <Badge tone="orange">Live campaign</Badge>
              <h3 className="mt-2 text-xl font-bold text-navy-900">
                {initiative.title}
              </h3>
              <div className="mt-3">
                <ProgressBar
                  goal={initiative.goal_amount}
                  raised={initiative.raised_amount}
                  donorCount={initiative.donor_count}
                  lastUpdated={initiative.last_updated}
                />
              </div>
              <div className="display-stat mt-3 text-sm font-bold text-orange-600">
                Support this →
              </div>
            </button>
          ))}
        </div>
      </div>
    </KioskFrame>
  )
}

function KioskInitiative({ initiativeId }: { initiativeId: string }) {
  const navigate = useNavigate()
  const { track } = useAnalytics()
  const [showQr, setShowQr] = useState(false)
  const initiative = getInitiative(initiativeId)
  useTrackOnMount('initiative_view', { initiative_id: initiativeId })

  if (!initiative) {
    return (
      <KioskFrame>
        <p className="text-white/60">This campaign isn’t available.</p>
      </KioskFrame>
    )
  }

  const openQr = () => {
    // Interaction-equivalent of the mobile support tap: the alum has
    // committed to taking the appeal to their phone.
    track('support_tap', {
      initiative_id: initiative.id,
      entity_id: initiative.linked_entity_id,
    })
    setShowQr(true)
  }

  return (
    <KioskFrame>
      <button
        onClick={() => navigate('/kiosk')}
        className="mb-6 cursor-pointer text-sm text-white/60 hover:text-white"
      >
        ← Back to the wall
      </button>
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <PlaceholderImage seed={initiative.photoSeed} className="rounded-2xl" />
          <h1 className="display-stat mt-5 text-4xl font-bold">
            {initiative.title}
          </h1>
          <p className="mt-3 max-w-xl leading-relaxed text-white/70">
            {initiative.story}
          </p>
          <div className="mt-5 max-w-md rounded-2xl bg-white p-5 text-ink-900">
            <ProgressBar
              goal={initiative.goal_amount}
              raised={initiative.raised_amount}
              donorCount={initiative.donor_count}
              lastUpdated={initiative.last_updated}
              size="lg"
            />
          </div>
        </div>

        <div className="space-y-4">
          {showQr ? (
            <>
              <QrHandoff
                url={buildQrUrl(initiative)}
                caption="Scan to open this campaign on your phone"
              />
              <TextMeLink initiativeId={initiative.id} />
              <p className="text-xs leading-relaxed text-white/40">
                Gifts happen on Syracuse’s giving platform, on your phone.
                This display never asks for a payment.
              </p>
            </>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="display-stat text-sm font-bold text-white/60">
                {initiative.raised_amount !== undefined
                  ? `${formatMoney(initiative.raised_amount)} raised so far`
                  : `Goal: ${formatMoney(initiative.goal_amount)}`}
              </div>
              <h2 className="mt-2 text-2xl font-bold">
                Take this one with you
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Support the campaign from your own phone — the gift goes
                straight to Syracuse’s giving page.
              </p>
              <button
                onClick={openQr}
                className="mt-5 w-full cursor-pointer rounded-2xl bg-orange-500 px-8 py-5 text-xl font-semibold text-white transition-colors hover:bg-orange-600"
              >
                Support this
              </button>
            </div>
          )}
        </div>
      </div>
    </KioskFrame>
  )
}
