import { useNavigate } from 'react-router-dom'
import { PhoneFrame } from '../components/frames/PhoneFrame'
import { demoAlum, DEMO_TEAM_ID } from '../data'
import { useAnalytics } from '../analytics/AnalyticsContext'

/**
 * The reach argument, rendered: Rocket's stated roadmap is texting alumni
 * their own highlights. This mock shows what that text could carry. No
 * real SMS is sent anywhere in this prototype.
 */
export default function SmsEntryPage() {
  const navigate = useNavigate()
  const { track } = useAnalytics()

  const openHighlight = () => {
    track('link_open', { entity_id: DEMO_TEAM_ID })
    navigate(`/m/team/${DEMO_TEAM_ID}`)
  }

  return (
    <PhoneFrame>
      <div className="flex h-full flex-col">
        {/* messages header */}
        <div className="border-b border-paper-dim bg-paper px-5 pb-3 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">
            SU
          </div>
          <div className="mt-1 text-xs font-semibold text-ink-900">
            Syracuse Rowing
          </div>
          <div className="text-[10px] text-ink-500">Wall of Records</div>
        </div>

        <div className="flex-1 space-y-3 px-4 py-5">
          <p className="text-center text-[10px] font-medium text-ink-300">
            Today 9:41 AM
          </p>
          <div className="animate-rise-in max-w-[85%] rounded-3xl rounded-bl-lg bg-paper-dim px-4 py-3 text-[15px] leading-snug text-ink-900">
            {demoAlum.phone_frame_message}
          </div>
          <button
            onClick={openHighlight}
            className="animate-rise-in ml-1 block max-w-[85%] cursor-pointer rounded-2xl border border-ink-300/60 bg-white p-3 text-left shadow-card transition-transform hover:scale-[1.01] active:scale-[0.99]"
            style={{ animationDelay: '0.15s' }}
          >
            <div className="display-stat text-xs font-bold text-orange-600">
              cuse.rocket.link/lw8-2014
            </div>
            <div className="mt-1 text-sm font-semibold text-navy-900">
              2014 Lightweight 8+ · Wall of Records
            </div>
            <div className="mt-0.5 text-xs text-ink-500">
              Syracuse Rowing · Ten Eyck Boathouse
            </div>
          </button>
        </div>

        <p className="px-6 pb-5 text-center text-[10px] leading-relaxed text-ink-300">
          Simulated text message — this prototype sends no SMS. Tap the link
          preview to open the highlight.
        </p>
      </div>
    </PhoneFrame>
  )
}
