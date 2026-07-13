import type { Initiative } from '../../data/types'
import { Badge } from '../ui/Badge'

/**
 * The single source of truth for how an initiative kind presents: badge
 * label and tone, the noun used in running copy, and the goal-only
 * caption. Exhaustive Record lookups, so adding a kind to the union
 * fails typecheck here instead of silently falling into a ternary's
 * else-branch somewhere across the surfaces.
 */
export const KIND_META: Record<
  Initiative['kind'],
  { label: string; tone: 'orange' | 'neutral'; noun: string; goalOnlyNote: string }
> = {
  live_campaign: {
    label: 'Live campaign',
    tone: 'orange',
    noun: 'campaign',
    goalOnlyNote: 'Progress figures published by Syracuse Athletics',
  },
  designated_fund: {
    label: 'Designated fund',
    tone: 'neutral',
    noun: 'fund',
    goalOnlyNote: 'Designated fund · Syracuse Athletics',
  },
}

export function KindBadge({ kind }: { kind: Initiative['kind'] }) {
  const meta = KIND_META[kind]
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}
