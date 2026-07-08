import type { ReactNode } from 'react'

/**
 * Device chrome for the mock SMS screen (and desktop previews of the
 * mobile flow). On real phone-width viewports the frame steps aside and
 * content renders full-bleed.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-orange-500 to-rust-800 p-4 sm:p-8">
      <div className="w-full max-w-[390px] overflow-hidden rounded-none sm:rounded-[2.5rem] sm:border-8 sm:border-black sm:shadow-2xl">
        <div className="relative flex h-dvh max-h-[780px] flex-col bg-paper">
          {/* status bar */}
          <div className="flex items-center justify-between bg-paper px-6 pt-3 pb-1 text-xs font-semibold text-ink-900">
            <span>9:41</span>
            <span className="hidden sm:block h-5 w-24 rounded-full bg-black" aria-hidden="true" />
            <span aria-hidden="true">▮▮▮ ⌁</span>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  )
}
