import { useState } from 'react'
import { useAnalytics } from '../../analytics/AnalyticsContext'

/**
 * Mocked "text me the link" — no SMS is sent. Sending fires
 * handoff_initiated on the kiosk surface: the appeal has left the wall
 * and is on its way to the alum's phone.
 */
export function TextMeLink({ initiativeId }: { initiativeId: string }) {
  const [phone, setPhone] = useState('')
  const [sent, setSent] = useState(false)
  const { track } = useAnalytics()

  if (sent) {
    return (
      <div className="rounded-2xl border border-white/15 bg-white/5 p-5 text-center">
        <div className="text-2xl" aria-hidden="true">
          ✓
        </div>
        <p className="mt-1 font-semibold text-white">Sent! Check your phone.</p>
        <p className="mt-1 text-xs text-white/50">
          Simulated — this prototype sends no SMS.
        </p>
      </div>
    )
  }

  return (
    <form
      className="rounded-2xl border border-white/15 bg-white/5 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        track('handoff_initiated', { initiative_id: initiativeId })
        setSent(true)
      }}
    >
      <label htmlFor="kiosk-phone" className="text-sm font-semibold text-white">
        Or text the link to your phone
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="kiosk-phone"
          type="tel"
          inputMode="tel"
          placeholder="(315) 555-0123"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-orange-500 focus:outline-none"
        />
        <button
          type="submit"
          className="cursor-pointer rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Send
        </button>
      </div>
    </form>
  )
}
