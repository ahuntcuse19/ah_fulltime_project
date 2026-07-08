export function SocialProof({
  donorCount,
  fallbackText,
}: {
  donorCount?: number
  fallbackText: string
}) {
  return (
    <p className="text-sm text-ink-500">
      {donorCount !== undefined ? (
        <>
          <span className="font-semibold text-rust-900">{donorCount} alumni</span>{' '}
          have supported this campaign.
        </>
      ) : (
        fallbackText
      )}
    </p>
  )
}
