const GRADIENTS: Array<[string, string]> = [
  ['#F76900', '#000E54'],
  ['#000E54', '#1B2A6B'],
  ['#DD5900', '#7A2E00'],
  ['#1B2A6B', '#F76900'],
  ['#101D63', '#DD5900'],
]

function hashSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

const aspects = {
  '16/9': 'aspect-video',
  '4/3': 'aspect-[4/3]',
  '1/1': 'aspect-square',
} as const

/**
 * Deterministic art in place of photos: a seeded gradient over the
 * orange/navy ramp with a duotone rowing-shell silhouette. Keeps the repo
 * free of stock-photo licensing while giving every entity a consistent,
 * intentional visual identity.
 */
export function PlaceholderImage({
  seed,
  label,
  aspect = '16/9',
  className = '',
}: {
  seed: string
  label?: string
  aspect?: keyof typeof aspects
  className?: string
}) {
  const [from, to] = GRADIENTS[hashSeed(seed) % GRADIENTS.length]
  return (
    <div
      className={`relative overflow-hidden ${aspects[aspect]} ${className}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      role="img"
      aria-label={label ?? 'Team photo placeholder'}
    >
      {/* Rowing eight silhouette: hull, oars, water line */}
      <svg
        viewBox="0 0 400 225"
        className="absolute inset-0 h-full w-full opacity-25"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g stroke="#fff" strokeLinecap="round" fill="none">
          {/* hull */}
          <path d="M30 150 Q200 138 370 150 Q200 160 30 150 Z" fill="#fff" stroke="none" />
          {/* rowers (abstract) */}
          {[70, 105, 140, 175, 210, 245, 280, 315].map((x) => (
            <g key={x}>
              <circle cx={x} cy={132} r={5} fill="#fff" stroke="none" />
              <path d={`M${x} 138 L${x - 6} 148`} strokeWidth={3} />
              {/* oar */}
              <path d={`M${x - 4} 144 L${x - 34} 168`} strokeWidth={2.5} />
            </g>
          ))}
          {/* water */}
          <path d="M0 172 Q50 166 100 172 T200 172 T300 172 T400 172" strokeWidth={2} opacity={0.7} />
          <path d="M0 186 Q50 180 100 186 T200 186 T300 186 T400 186" strokeWidth={2} opacity={0.4} />
        </g>
      </svg>
      {label && (
        <span className="display-stat absolute bottom-2 left-3 text-[10px] font-semibold text-white/70">
          {label}
        </span>
      )}
    </div>
  )
}
