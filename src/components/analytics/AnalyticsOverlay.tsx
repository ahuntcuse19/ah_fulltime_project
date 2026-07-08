import { useEffect, useState } from 'react'
import { useAnalyticsEvents } from '../../analytics/AnalyticsContext'
import { clearEvents } from '../../analytics/store'
import { FunnelViz } from './FunnelViz'
import { EventLog } from './EventLog'
import type { Surface } from '../../data/types'

type Filter = 'all' | Surface

/**
 * Instrumentation layer for the demo: a floating toggle on every screen
 * (including the mock external page, where visibly NOTHING fires) and a
 * panel with the surface-split funnel plus a live event log.
 */
export function AnalyticsOverlay() {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const events = useAnalyticsEvents()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (e.key === 'a') setOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const filtered =
    filter === 'all' ? events : events.filter((e) => e.surface === filter)

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-4 right-4 z-50 flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-bold shadow-lg transition-colors ${
          open
            ? 'bg-orange-500 text-white'
            : 'bg-ink-900 text-white/90 hover:bg-black'
        }`}
        aria-expanded={open}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${open ? 'bg-white' : 'bg-orange-500'}`}
          aria-hidden="true"
        />
        Analytics {events.length > 0 && `(${events.length})`}
      </button>

      {open && (
        <aside
          className="fixed bottom-16 right-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-2xl bg-ink-900/95 p-4 text-white shadow-2xl backdrop-blur animate-rise-in"
          aria-label="Analytics mode"
        >
          <div className="flex items-center justify-between">
            <h2 className="display-stat text-xs font-bold text-white/70">
              Funnel · live
            </h2>
            <div className="flex items-center gap-1">
              {(['all', 'mobile', 'kiosk'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`cursor-pointer rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${
                    filter === f
                      ? 'bg-white/20 text-white'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {f}
                </button>
              ))}
              <button
                onClick={clearEvents}
                className="ml-1 cursor-pointer rounded-md px-2 py-1 text-[10px] font-semibold text-white/40 hover:text-white/70"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-3">
            <FunnelViz events={filtered} />
          </div>

          <div className="mt-3 max-h-44 overflow-y-auto border-t border-white/10 pt-2">
            <EventLog events={filtered} />
          </div>
        </aside>
      )}
    </>
  )
}
