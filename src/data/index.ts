import { entities } from './entities'
import { initiatives } from './initiatives'
import { demoAlum } from './alum'
import type { Entity, Initiative } from './types'

export { entities, initiatives, demoAlum }
export * from './types'

export function getEntity(id: string): Entity | undefined {
  return entities.find((e) => e.id === id)
}

export function getInitiative(id: string): Initiative | undefined {
  return initiatives.find((i) => i.id === id)
}

/**
 * Initiatives relevant to an entity: its own campaign(s) first, then the
 * program-level designated fund as a fallback destination.
 */
export function getInitiativesForEntity(entityId: string): Initiative[] {
  const direct = initiatives.filter((i) => i.linked_entity_id === entityId)
  const programLevel = initiatives.filter(
    (i) =>
      i.linked_entity_id === 'rowing-program' && i.linked_entity_id !== entityId,
  )
  return [...direct, ...programLevel]
}

/** The team page the demo SMS deep-links to. */
export const DEMO_TEAM_ID = demoAlum.teams[0]
