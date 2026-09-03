// Pure reads over AppState. Nothing here is stored; everything is derived.
import { CATALOG_ORDER } from './catalog'
import type { AppState, Case, EventLogEntry, Item, Parcel, Person, PersonRole, Tier } from './types'

const DAY = 86_400_000

export function must<T>(map: Record<string, T>, id: string): T {
  const v = map[id]
  if (v === undefined) throw new Error(`Missing record ${id}`)
  return v
}

export function caseItems(s: AppState, caseId: string): Item[] {
  return must(s.cases, caseId).itemIds.map((id) => must(s.items, id))
}

export function caseParcels(s: AppState, caseId: string): Parcel[] {
  return must(s.cases, caseId).parcelIds.map((id) => must(s.parcels, id))
}

export function parcelItems(s: AppState, parcelId: string): Item[] {
  return must(s.parcels, parcelId).itemIds.map((id) => must(s.items, id))
}

export function outstanding(s: AppState, caseId: string): number {
  return caseItems(s, caseId).filter((it) => it.status !== 'accepted').length
}

export interface BlockedPerson {
  personId: string
  name: string
  roles: PersonRole[]
  outstandingCount: number
}

/** People with at least one non-accepted item in the case, in org order. */
export function blockedOn(s: AppState, caseId: string): BlockedPerson[] {
  const c = must(s.cases, caseId)
  const org = must(s.orgs, c.organizationId)
  const items = caseItems(s, caseId)
  return org.personIds
    .map((pid) => {
      const p = must(s.people, pid)
      const n = items.filter((it) => it.assignedPersonId === pid && it.status !== 'accepted').length
      return { personId: pid, name: p.name, roles: p.roles, outstandingCount: n }
    })
    .filter((b) => b.outstandingCount > 0)
}

export function daysOpen(s: AppState, c: Case): number {
  return Math.floor((Date.parse(s.now) - Date.parse(c.createdAt)) / DAY)
}

export function parcelProgress(s: AppState, parcelId: string): { accepted: number; total: number } {
  const items = parcelItems(s, parcelId)
  return { accepted: items.filter((it) => it.status === 'accepted').length, total: items.length }
}

/** A person's parcels in a case: primary first, then re-requests in creation order. */
export function personParcels(s: AppState, personId: string, caseId: string): Parcel[] {
  const mine = caseParcels(s, caseId).filter((p) => p.personId === personId)
  return [...mine.filter((p) => !p.isReRequest), ...mine.filter((p) => p.isReRequest)]
}

export function estimateMinutes(s: AppState, parcelId: string): number {
  const items = parcelItems(s, parcelId)
  const u = items.filter((it) => it.status === 'not_started' || it.status === 'more_info_needed').length
  const p = items.filter((it) => it.status === 'prefilled_unconfirmed').length
  return Math.max(5, Math.ceil((2 * u + 0.5 * p) / 5) * 5)
}

/** Newest first; ties broken by insertion order (later entries first). */
export function timeline(s: AppState, caseId: string): EventLogEntry[] {
  return s.log
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.caseId === caseId)
    .sort((a, b) => Date.parse(b.e.at) - Date.parse(a.e.at) || b.i - a.i)
    .map(({ e }) => e)
}

export function sortByCatalog<T extends { requirementKey: Item['requirementKey'] }>(items: T[]): T[] {
  return [...items].sort((a, b) => CATALOG_ORDER[a.requirementKey] - CATALOG_ORDER[b.requirementKey])
}

export function subjectName(s: AppState, item: Pick<Item, 'subjectKind' | 'subjectId'>): string {
  switch (item.subjectKind) {
    case 'organization':
      return must(s.orgs, item.subjectId).legalName
    case 'legalEntity':
      return must(s.entities, item.subjectId).legalName
    case 'person':
      return must(s.people, item.subjectId).name
  }
}

export function relativeTime(now: string, at: string): string {
  const days = Math.floor((Date.parse(now) - Date.parse(at)) / DAY)
  if (days <= 0) return 'today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

/** The case a person should land on when the demo switches to them. */
export function caseForPerson(s: AppState, personId: string, preferredCaseId: string | null): string | null {
  const person = must(s.people, personId)
  if (preferredCaseId && caseParcels(s, preferredCaseId).some((p) => p.personId === personId)) return preferredCaseId
  const mine = Object.values(s.cases)
    .filter((c) => c.organizationId === person.organizationId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  return mine[0]?.id ?? null
}

// ---- Structure (v2) ----

export interface StructureView {
  people: Person[]
  entities: { entityId: string; legalName: string; jurisdiction: string; holder: Person }[]
}

export function structure(s: AppState, caseId: string): StructureView {
  const c = must(s.cases, caseId)
  const org = must(s.orgs, c.organizationId)
  const people = org.personIds.map((id) => must(s.people, id))
  const admin = people.find((p) => p.roles.includes('admin')) ?? people[0]
  return {
    people,
    entities: org.legalEntityIds.map((eid) => {
      const e = must(s.entities, eid)
      return {
        entityId: eid,
        legalName: e.legalName,
        jurisdiction: e.jurisdiction,
        holder: e.delegatePersonId ? must(s.people, e.delegatePersonId) : admin,
      }
    }),
  }
}

// ---- Metrics ----

export interface Metrics {
  medianDays: number | null
  fundedCount: number
  completionByTier: { tier: Tier; done: number; total: number }[]
  stalls: { initial: number; reRequest: number } | null
  blockedByRole: { role: PersonRole; count: number }[] | null
  blockedTotal: number
}

const OPEN: Case['status'][] = ['collecting', 'in_review', 'more_info_needed']
const ROLE_PRIORITY: PersonRole[] = ['ubo', 'officer', 'advisor', 'admin']

export function metrics(s: AppState): Metrics {
  const cases = Object.values(s.cases)
  const funded = cases.filter((c) => c.firstTransactionAt)
  const days = funded
    .map((c) => Math.floor((Date.parse(c.firstTransactionAt!) - Date.parse(c.createdAt)) / DAY))
    .sort((a, b) => a - b)
  const medianDays =
    days.length === 0 ? null : days.length % 2 ? days[(days.length - 1) / 2] : (days[days.length / 2 - 1] + days[days.length / 2]) / 2

  const completionByTier = (['simple', 'standard', 'complex'] as Tier[])
    .map((tier) => {
      const of = cases.filter((c) => c.tier === tier)
      return { tier, done: of.filter((c) => c.status === 'approved' || c.status === 'funded').length, total: of.length }
    })
    .filter((t) => t.total > 0)

  const open = cases.filter((c) => OPEN.includes(c.status) && outstanding(s, c.id) > 0)
  let stalls: Metrics['stalls'] = null
  if (open.length > 0) {
    stalls = { initial: 0, reRequest: 0 }
    for (const c of open) {
      const atReRequest = caseItems(s, c.id).some(
        (it) => it.status !== 'accepted' && caseParcels(s, c.id).some((p) => p.isReRequest && p.itemIds.includes(it.id)),
      )
      if (atReRequest) stalls.reRequest += 1
      else stalls.initial += 1
    }
  }

  const blocked = cases.filter((c) => OPEN.includes(c.status)).flatMap((c) => blockedOn(s, c.id))
  const counts = new Map<PersonRole, number>()
  for (const b of blocked) {
    const role = ROLE_PRIORITY.find((r) => b.roles.includes(r)) ?? 'admin'
    counts.set(role, (counts.get(role) ?? 0) + 1)
  }
  const blockedByRole =
    blocked.length === 0 ? null : ROLE_PRIORITY.filter((r) => counts.has(r)).map((r) => ({ role: r, count: counts.get(r)! }))

  return { medianDays, fundedCount: funded.length, completionByTier, stalls, blockedByRole, blockedTotal: blocked.length }
}
