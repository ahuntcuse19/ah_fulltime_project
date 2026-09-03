// Pure derivations: tier, requirement instantiation, parcel assignment,
// pre-fill. No state, no ids of their own (an IdGen is passed in).
import { REQUIREMENTS, REQ_BY_KEY } from './catalog'
import { EIN_LOOKUP } from './registry'
import type {
  Item,
  Jurisdiction,
  LegalEntity,
  Organization,
  Parcel,
  Person,
  RequirementKey,
  Tier,
} from './types'

export type IdGen = (prefix: string) => string

export interface StructureCounts {
  entityCount: number
  uboCount: number
  jurisdictionCount: number
  isMsb: boolean
}

export function computeTier(c: StructureCounts): Tier {
  if (c.isMsb || c.entityCount >= 4 || c.jurisdictionCount >= 3) return 'complex'
  if (c.entityCount === 1 && c.uboCount === 1 && c.jurisdictionCount === 1) return 'simple'
  return 'standard'
}

export function structureCounts(org: Organization, entities: LegalEntity[], people: Person[]): StructureCounts {
  const jurisdictions = new Set<Jurisdiction>(org.operatingJurisdictions)
  entities.forEach((e) => jurisdictions.add(e.jurisdiction))
  return {
    entityCount: entities.length,
    uboCount: people.filter((p) => p.roles.includes('ubo')).length,
    jurisdictionCount: jurisdictions.size,
    isMsb: org.isMoneyServicesBusiness,
  }
}

/** Pre-fill value, or undefined when the item must start not_started. */
export function prefillValue(org: Organization, entity: LegalEntity | undefined, key: RequirementKey): string | undefined {
  if (!REQ_BY_KEY[key].autoPopulatable || !org.ein) return undefined
  const rec = EIN_LOOKUP[org.ein]
  if (!rec) return undefined
  switch (key) {
    case 'legal_name':
      return rec.legalName
    case 'ein':
      return org.ein
    case 'registered_address':
      return rec.registeredAddress
    case 'entity_registration_number':
    case 'entity_registered_address': {
      if (!entity || entity.jurisdiction !== 'US') return undefined
      const e = rec.entities[entity.id]
      if (!e) return undefined
      return key === 'entity_registration_number' ? e.registrationNumber : e.registeredAddress
    }
    default:
      return undefined
  }
}

function makeItem(ids: IdGen, caseId: string, key: RequirementKey, subjectId: string, value: string | undefined): Item {
  return {
    id: ids('item'),
    caseId,
    requirementKey: key,
    subjectKind: REQ_BY_KEY[key].subjectKind,
    subjectId,
    assignedPersonId: '',
    status: value === undefined ? 'not_started' : 'prefilled_unconfirmed',
    value,
    originParcelId: '',
  }
}

export function instantiateOrg(ids: IdGen, org: Organization, caseId: string, uboCount: number): Item[] {
  return REQUIREMENTS.filter((r) => r.subjectKind === 'organization')
    .filter((r) => r.key !== 'msb_license' || org.isMoneyServicesBusiness)
    .filter((r) => r.key !== 'ownership_chart' || uboCount >= 2)
    .map((r) => makeItem(ids, caseId, r.key, org.id, prefillValue(org, undefined, r.key)))
}

export function instantiateEntity(ids: IdGen, org: Organization, entity: LegalEntity, caseId: string): Item[] {
  return REQUIREMENTS.filter((r) => r.subjectKind === 'legalEntity').map((r) =>
    makeItem(ids, caseId, r.key, entity.id, prefillValue(org, entity, r.key)),
  )
}

const SUBJECT_ROLES = ['ubo', 'officer', 'admin'] as const

export function isSubjectPerson(person: Person): boolean {
  return person.roles.some((r) => (SUBJECT_ROLES as readonly string[]).includes(r))
}

export function instantiatePerson(ids: IdGen, person: Person, caseId: string): Item[] {
  if (!isSubjectPerson(person)) return []
  return REQUIREMENTS.filter((r) => r.subjectKind === 'person')
    .filter((r) => r.key !== 'ownership_percent' || person.roles.includes('ubo'))
    .filter((r) => r.key !== 'officer_authorization' || person.roles.includes('officer'))
    .map((r) => makeItem(ids, caseId, r.key, person.id, undefined))
}

export function instantiateCase(
  ids: IdGen,
  org: Organization,
  entities: LegalEntity[],
  people: Person[],
  caseId: string,
): Item[] {
  const uboCount = people.filter((p) => p.roles.includes('ubo')).length
  return [
    ...instantiateOrg(ids, org, caseId, uboCount),
    ...entities.flatMap((e) => instantiateEntity(ids, org, e, caseId)),
    ...people.flatMap((p) => instantiatePerson(ids, p, caseId)),
  ]
}

/** The admin: first person in org order whose roles include 'admin'. */
export function adminOf(org: Organization, people: Record<string, Person>): Person {
  const admin = org.personIds.map((id) => people[id]).find((p) => p && p.roles.includes('admin'))
  if (!admin) throw new Error(`Organization ${org.id} has no admin`)
  return admin
}

export function assigneeFor(
  item: Pick<Item, 'subjectKind' | 'subjectId'>,
  org: Organization,
  entities: Record<string, LegalEntity>,
  adminId: string,
): string {
  switch (item.subjectKind) {
    case 'organization':
      return org.delegatePersonId ?? adminId
    case 'legalEntity':
      return entities[item.subjectId]?.delegatePersonId ?? adminId
    case 'person':
      return item.subjectId
  }
}

/** One parcel per person with at least one item, in org.personIds order. */
export function assignParcels(
  ids: IdGen,
  caseId: string,
  items: Item[],
  org: Organization,
  entities: Record<string, LegalEntity>,
  people: Record<string, Person>,
): { parcels: Parcel[]; items: Item[] } {
  const admin = adminOf(org, people)
  const assigned = items.map((it) => ({ ...it, assignedPersonId: assigneeFor(it, org, entities, admin.id) }))
  const parcels: Parcel[] = []
  for (const personId of org.personIds) {
    const mine = assigned.filter((it) => it.assignedPersonId === personId)
    if (mine.length === 0) continue
    const id = ids('parcel')
    parcels.push({
      id,
      caseId,
      personId,
      itemIds: mine.map((it) => it.id),
      status: 'sent',
      token: `tok_${id}`,
      isReRequest: false,
    })
    mine.forEach((it) => (it.originParcelId = id))
  }
  return { parcels, items: assigned }
}
