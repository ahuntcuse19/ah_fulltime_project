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
 * Only initiatives the school actually runs for THIS entity — no
 * program-level fallback. A team with no live campaign gets recognition
 * content and no giving module; the absence is the honest system signal
 * that Rocket surfaces existing campaigns rather than inventing an ask.
 */
export function getInitiativesForEntity(entityId: string): Initiative[] {
  return initiatives.filter((i) => i.linked_entity_id === entityId)
}

/**
 * The other teams on the wall — powers the team page's "More from the
 * Wall" links, which is how the demo reaches a team with no linked
 * fundraiser without adding a second persona.
 */
export function getTeamsExcept(entityId: string): Entity[] {
  return entities.filter((e) => e.type === 'team' && e.id !== entityId)
}

/** The team page the demo SMS deep-links to. */
export const DEMO_TEAM_ID = demoAlum.teams[0]
