export function Stat({
  value,
  label,
  size = 'md',
}: {
  value: string
  label: string
  size?: 'md' | 'lg'
}) {
  return (
    <div>
      <div
        className={`display-stat font-bold text-rust-900 ${
          size === 'lg' ? 'text-3xl' : 'text-xl'
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs text-ink-500">{label}</div>
    </div>
  )
}
