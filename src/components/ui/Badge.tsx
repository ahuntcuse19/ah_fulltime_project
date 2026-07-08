import type { ReactNode } from 'react'

type Tone = 'orange' | 'deep' | 'neutral'

const tones: Record<Tone, string> = {
  orange: 'bg-orange-100 text-orange-600',
  deep: 'bg-orange-600 text-white',
  neutral: 'bg-paper-dim text-ink-500',
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: Tone
  children: ReactNode
}) {
  return (
    <span
      className={`display-stat inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
