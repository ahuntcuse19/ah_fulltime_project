import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * The in-building surface, framed honestly: alumni touch the display at
 * event moments — reunions, inductions, homecoming — not day-to-day.
 */
export function KioskFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-navy-900 text-white">
      <div className="border-b border-white/10 bg-navy-800/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="display-stat text-sm font-bold tracking-wide text-white/90">
            Syracuse Rowing · Wall of Records
          </div>
          <div className="display-stat rounded-md bg-orange-500 px-3 py-1 text-xs font-bold text-white">
            Homecoming Weekend · Ten Eyck Boathouse
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      <footer className="mx-auto max-w-6xl px-6 pb-6 text-xs text-white/40">
        Touchscreen surface — shown here at kiosk scale.{' '}
        <Link to="/" className="underline hover:text-white/70">
          Switch to the mobile flow
        </Link>
      </footer>
    </div>
  )
}
