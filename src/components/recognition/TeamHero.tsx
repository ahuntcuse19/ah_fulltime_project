import type { Entity } from '../../data/types'
import { Badge } from '../ui/Badge'
import { PlaceholderImage } from '../ui/PlaceholderImage'

const typeLabel: Record<Entity['type'], string> = {
  team: 'Wall of Records',
  era: 'Era',
  person: 'Hall of Fame',
  program: 'Program',
}

export function TeamHero({ entity }: { entity: Entity }) {
  return (
    <header>
      <PlaceholderImage
        seed={entity.photoSeed}
        label="Ten Eyck Boathouse · Onondaga Lake"
        className="rounded-b-3xl"
      />
      <div className="px-5 pt-4">
        <div className="flex items-center gap-2">
          <Badge tone="navy">{typeLabel[entity.type]}</Badge>
          <span className="text-xs font-medium text-ink-500">{entity.years}</span>
        </div>
        <h1 className="display-stat mt-2 text-3xl font-bold text-navy-900">
          {entity.name}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
          {entity.tagline}
        </p>
      </div>
    </header>
  )
}
