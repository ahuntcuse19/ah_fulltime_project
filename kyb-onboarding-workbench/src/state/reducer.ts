// One pure reducer. Every state change in the app goes through here, which
// is what makes the seed a replayable script and the previews (v2) free.
import { PARTY_LABEL, REQ_BY_KEY, ROLE_LABEL, TIER_LABEL } from '../model/catalog'
import {
  adminOf,
  assigneeFor,
  assignParcels,
  computeTier,
  instantiateCase,
  instantiateEntity,
  instantiatePerson,
  structureCounts,
} from '../model/rules'
import type {
  AppState,
  DownstreamParty,
  Item,
  ItemStatus,
  Jurisdiction,
  LegalEntity,
  Organization,
  Parcel,
  Person,
  PersonRole,
  RequirementKey,
  SubjectKind,
  TriageAnswers,
  View,
} from '../model/types'

export type Actor = string | 'operator'

export interface NewItemSpec {
  requirementKey: RequirementKey
  subjectKind: SubjectKind
  subjectId: string
}

export interface CollaboratorDraft {
  name: string
  email: string
  roles: PersonRole[]
  jurisdiction: Jurisdiction
  ownershipPercent?: number
}

export type Action =
  | { type: 'triage/confirm'; answers: TriageAnswers; org: Organization; entities: LegalEntity[]; people: Person[] }
  | { type: 'item/provide'; itemId: string; value: string; actorPersonId: Actor }
  | { type: 'item/confirm'; itemId: string; actorPersonId: Actor }
  | { type: 'parcel/submit'; parcelId: string; actorPersonId: Actor }
  | { type: 'parcel/confirmAllAndSubmit'; parcelId: string; actorPersonId: Actor }
  | { type: 'item/accept'; itemId: string }
  | { type: 'case/acceptAllInReview'; caseId: string }
  | { type: 'item/moreInfo'; itemId: string; note: string }
  | {
      type: 'case/raiseReRequest'
      caseId: string
      raisedBy: DownstreamParty
      reason: string
      recipientPersonId: string
      newItems: NewItemSpec[]
      moveItemIds: string[]
    }
  | { type: 'case/nudge'; caseId: string; personId: string; actorPersonId?: Actor }
  | { type: 'case/approve'; caseId: string }
  | { type: 'case/fund'; caseId: string }
  | { type: 'nav'; view: View }
  | { type: 'demo/switchPerson'; personId: string | null }
  | { type: 'sys/setNow'; now: string }
  | { type: 'reset' }
  | {
      type: 'case/addCollaborator'
      caseId: string
      actorPersonId: Actor
      draft: CollaboratorDraft
      delegateFor: { org: boolean; entityIds: string[] }
    }
  | {
      type: 'case/addEntity'
      caseId: string
      actorPersonId: Actor
      legalName: string
      jurisdiction: Jurisdiction
      delegatePersonId?: string
    }

// ---- Draft helpers. A draft is a shallow copy; records are replaced, never mutated. ----

function clone(s: AppState): AppState {
  return {
    ...s,
    orgs: { ...s.orgs },
    entities: { ...s.entities },
    people: { ...s.people },
    cases: { ...s.cases },
    items: { ...s.items },
    parcels: { ...s.parcels },
    log: [...s.log],
  }
}

function nextId(d: AppState, prefix: string): string {
  d.seq += 1
  return `${prefix}_${d.seq}`
}

function pushLog(d: AppState, caseId: string, actor: string, message: string): void {
  d.log.push({ id: nextId(d, 'evt'), caseId, at: d.now, actor, message })
}

function actorName(d: AppState, actor: Actor): string {
  return actor === 'operator' ? 'operator' : d.people[actor]?.name ?? 'operator'
}

function label(item: Item): string {
  return REQ_BY_KEY[item.requirementKey].label
}

function subject(d: AppState, item: Pick<Item, 'subjectKind' | 'subjectId'>): string {
  if (item.subjectKind === 'organization') return d.orgs[item.subjectId].legalName
  if (item.subjectKind === 'legalEntity') return d.entities[item.subjectId].legalName
  return d.people[item.subjectId].name
}

function patchItem(d: AppState, id: string, patch: Partial<Item>): void {
  d.items[id] = { ...d.items[id], ...patch }
}
function patchParcel(d: AppState, id: string, patch: Partial<Parcel>): void {
  d.parcels[id] = { ...d.parcels[id], ...patch }
}
function patchCase(d: AppState, id: string, patch: Partial<AppState['cases'][string]>): void {
  d.cases[id] = { ...d.cases[id], ...patch }
}

const OUTSTANDING: ItemStatus[] = ['not_started', 'prefilled_unconfirmed', 'more_info_needed']
const DONE_OR_PENDING: ItemStatus[] = ['provided', 'in_review', 'accepted']

function syncParcel(d: AppState, parcelId: string): void {
  const p = d.parcels[parcelId]
  const items = p.itemIds.map((id) => d.items[id])
  let status: Parcel['status']
  if (items.length === 0 || items.every((it) => it.status === 'accepted')) status = 'complete'
  else if (items.some((it) => OUTSTANDING.includes(it.status)))
    status = p.submittedAt || items.some((it) => DONE_OR_PENDING.includes(it.status)) ? 'in_progress' : 'sent'
  else status = p.submittedAt ? 'submitted' : 'in_progress'
  if (status !== p.status) patchParcel(d, parcelId, { status })
}

function syncCase(d: AppState, caseId: string): void {
  const c = d.cases[caseId]
  if (!['collecting', 'in_review', 'more_info_needed'].includes(c.status)) return
  const items = c.itemIds.map((id) => d.items[id])
  const parcels = c.parcelIds.map((id) => d.parcels[id])
  let status: AppState['cases'][string]['status']
  if (items.some((it) => it.status === 'more_info_needed')) status = 'more_info_needed'
  else if (parcels.every((p) => p.status === 'submitted' || p.status === 'complete')) status = 'in_review'
  else status = 'collecting'
  if (status !== c.status) patchCase(d, caseId, { status })
}

function syncAll(d: AppState, caseId: string): void {
  d.cases[caseId].parcelIds.forEach((pid) => syncParcel(d, pid))
  syncCase(d, caseId)
}

function isAssigneeOrOperator(item: Item, actor: Actor): boolean {
  return actor === 'operator' || item.assignedPersonId === actor
}

/** Move an item into another parcel, keeping its status and note. */
function moveItem(d: AppState, itemId: string, toParcelId: string, personId: string): void {
  const it = d.items[itemId]
  const from = d.parcels[it.originParcelId]
  if (from) patchParcel(d, from.id, { itemIds: from.itemIds.filter((id) => id !== itemId) })
  patchParcel(d, toParcelId, { itemIds: [...d.parcels[toParcelId].itemIds, itemId] })
  patchItem(d, itemId, { assignedPersonId: personId, originParcelId: toParcelId })
  if (from) syncParcel(d, from.id)
}

function primaryParcelOf(d: AppState, caseId: string, personId: string): Parcel | undefined {
  return d.cases[caseId].parcelIds.map((id) => d.parcels[id]).find((p) => p.personId === personId && !p.isReRequest)
}

function createParcel(d: AppState, caseId: string, personId: string, extra: Partial<Parcel> = {}): Parcel {
  const id = nextId(d, 'parcel')
  const parcel: Parcel = { id, caseId, personId, itemIds: [], status: 'sent', token: `tok_${id}`, isReRequest: false, ...extra }
  d.parcels[id] = parcel
  patchCase(d, caseId, { parcelIds: [...d.cases[caseId].parcelIds, id] })
  return parcel
}

function addItemsToParcel(d: AppState, parcelId: string, items: Item[]): void {
  const p = d.parcels[parcelId]
  items.forEach((it) => {
    d.items[it.id] = { ...it, assignedPersonId: p.personId, originParcelId: parcelId }
  })
  patchParcel(d, parcelId, { itemIds: [...p.itemIds, ...items.map((it) => it.id)] })
  patchCase(d, p.caseId, { itemIds: [...d.cases[p.caseId].itemIds, ...items.map((it) => it.id)] })
}

function submitParcel(d: AppState, parcelId: string, actor: Actor): boolean {
  const p = d.parcels[parcelId]
  const items = p.itemIds.map((id) => d.items[id])
  if (!items.every((it) => DONE_OR_PENDING.includes(it.status)) || !items.some((it) => it.status === 'provided')) return false
  const k = items.filter((it) => it.status === 'provided').length
  items.filter((it) => it.status === 'provided').forEach((it) => patchItem(d, it.id, { status: 'in_review' }))
  patchParcel(d, parcelId, { submittedAt: d.now })
  syncParcel(d, parcelId)
  syncCase(d, p.caseId)
  pushLog(d, p.caseId, actorName(d, actor), `Submitted ${k} items for review.`)
  return true
}

function recomputeTier(d: AppState, caseId: string, actor: string): void {
  const c = d.cases[caseId]
  const org = d.orgs[c.organizationId]
  const tier = computeTier(
    structureCounts(
      org,
      org.legalEntityIds.map((id) => d.entities[id]),
      org.personIds.map((id) => d.people[id]),
    ),
  )
  if (tier !== c.tier) {
    patchCase(d, caseId, { tier })
    pushLog(d, caseId, actor, `Tier changed from ${TIER_LABEL[c.tier]} to ${TIER_LABEL[tier]}.`)
  }
}

// ---- The reducer ----

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'triage/confirm': {
      const { org, entities, people } = action
      if (!people.some((p) => p.roles.includes('admin'))) return state
      const d = clone(state)
      d.orgs[org.id] = org
      entities.forEach((e) => (d.entities[e.id] = e))
      people.forEach((p) => (d.people[p.id] = p))
      const caseId = nextId(d, 'case')
      const ids = (prefix: string) => nextId(d, prefix)
      const raw = instantiateCase(ids, org, entities, people, caseId)
      const { parcels, items } = assignParcels(ids, caseId, raw, org, d.entities, d.people)
      items.forEach((it) => (d.items[it.id] = it))
      parcels.forEach((p) => (d.parcels[p.id] = p))
      const tier = computeTier(structureCounts(org, entities, people))
      d.cases[caseId] = {
        id: caseId,
        organizationId: org.id,
        tier,
        status: 'collecting',
        createdAt: d.now,
        parcelIds: parcels.map((p) => p.id),
        itemIds: items.map((it) => it.id),
      }
      pushLog(d, caseId, 'operator', `Case created from triage: ${TIER_LABEL[tier]} tier, ${items.length} items across ${parcels.length} parcels.`)
      parcels.forEach((p) => pushLog(d, caseId, 'operator', `Request sent to ${d.people[p.personId].name} (${p.itemIds.length} items).`))
      d.view = { kind: 'case', caseId }
      return d
    }

    case 'item/provide': {
      const it = state.items[action.itemId]
      if (!it || !OUTSTANDING.includes(it.status) || !isAssigneeOrOperator(it, action.actorPersonId)) return state
      const d = clone(state)
      patchItem(d, it.id, { status: 'provided', value: action.value, reviewerNote: undefined })
      syncParcel(d, it.originParcelId)
      syncCase(d, it.caseId)
      pushLog(d, it.caseId, actorName(d, action.actorPersonId), `Provided ${label(it)} for ${subject(d, it)}.`)
      return d
    }

    case 'item/confirm': {
      const it = state.items[action.itemId]
      if (!it || it.status !== 'prefilled_unconfirmed' || !isAssigneeOrOperator(it, action.actorPersonId)) return state
      const d = clone(state)
      patchItem(d, it.id, { status: 'provided' })
      syncParcel(d, it.originParcelId)
      syncCase(d, it.caseId)
      pushLog(d, it.caseId, actorName(d, action.actorPersonId), `Confirmed ${label(it)}.`)
      return d
    }

    case 'parcel/submit': {
      if (!state.parcels[action.parcelId]) return state
      const d = clone(state)
      return submitParcel(d, action.parcelId, action.actorPersonId) ? d : state
    }

    case 'parcel/confirmAllAndSubmit': {
      const p = state.parcels[action.parcelId]
      if (!p) return state
      const items = p.itemIds.map((id) => state.items[id])
      if (items.some((it) => it.status === 'not_started' || it.status === 'more_info_needed')) return state
      const d = clone(state)
      const prefilled = items.filter((it) => it.status === 'prefilled_unconfirmed')
      prefilled.forEach((it) => patchItem(d, it.id, { status: 'provided' }))
      if (prefilled.length > 0) pushLog(d, p.caseId, actorName(d, action.actorPersonId), `Confirmed ${prefilled.length} pre-filled items.`)
      return submitParcel(d, p.id, action.actorPersonId) ? d : state
    }

    case 'item/accept': {
      const it = state.items[action.itemId]
      if (!it || (it.status !== 'provided' && it.status !== 'in_review')) return state
      const d = clone(state)
      patchItem(d, it.id, { status: 'accepted' })
      syncParcel(d, it.originParcelId)
      syncCase(d, it.caseId)
      pushLog(d, it.caseId, 'operator', `Accepted ${label(it)} for ${subject(d, it)}.`)
      return d
    }

    case 'case/acceptAllInReview': {
      const c = state.cases[action.caseId]
      if (!c) return state
      const inReview = c.itemIds.map((id) => state.items[id]).filter((it) => it.status === 'in_review')
      if (inReview.length === 0) return state
      const d = clone(state)
      inReview.forEach((it) => patchItem(d, it.id, { status: 'accepted' }))
      syncAll(d, c.id)
      pushLog(d, c.id, 'operator', `Accepted ${inReview.length} items.`)
      return d
    }

    case 'item/moreInfo': {
      const it = state.items[action.itemId]
      const note = action.note.trim()
      if (!it || (it.status !== 'provided' && it.status !== 'in_review') || !note) return state
      const d = clone(state)
      patchItem(d, it.id, { status: 'more_info_needed', reviewerNote: note })
      syncParcel(d, it.originParcelId)
      syncCase(d, it.caseId)
      pushLog(d, it.caseId, 'operator', `Needs more information: ${label(it)} for ${subject(d, it)}. ${note}`)
      return d
    }

    case 'case/raiseReRequest': {
      const c = state.cases[action.caseId]
      const reason = action.reason.trim()
      if (!c || !reason || action.newItems.length + action.moveItemIds.length === 0) return state
      if (!state.people[action.recipientPersonId]) return state
      const movable = action.moveItemIds.every((id) => {
        const it = state.items[id]
        return it && it.caseId === c.id && it.status === 'more_info_needed' && !state.parcels[it.originParcelId]?.isReRequest
      })
      if (!movable) return state
      const d = clone(state)
      const parcel = createParcel(d, c.id, action.recipientPersonId, {
        isReRequest: true,
        raisedBy: action.raisedBy,
        reason,
      })
      const fresh: Item[] = action.newItems.map((spec) => ({
        id: nextId(d, 'item'),
        caseId: c.id,
        requirementKey: spec.requirementKey,
        subjectKind: spec.subjectKind,
        subjectId: spec.subjectId,
        assignedPersonId: action.recipientPersonId,
        status: 'not_started',
        originParcelId: parcel.id,
      }))
      addItemsToParcel(d, parcel.id, fresh)
      action.moveItemIds.forEach((id) => moveItem(d, id, parcel.id, action.recipientPersonId))
      syncParcel(d, parcel.id)
      patchCase(d, c.id, { status: 'more_info_needed' })
      const all = d.parcels[parcel.id].itemIds.map((id) => d.items[id])
      pushLog(d, c.id, PARTY_LABEL[action.raisedBy], `Re-request: ${reason}`)
      pushLog(
        d,
        c.id,
        'operator',
        `Re-request routed to ${d.people[action.recipientPersonId].name} (${all.length} items: ${all.map(label).join(', ')}).`,
      )
      return d
    }

    case 'case/nudge': {
      const c = state.cases[action.caseId]
      const person = state.people[action.personId]
      if (!c || !person) return state
      const k = c.itemIds.map((id) => state.items[id]).filter((it) => it.assignedPersonId === person.id && it.status !== 'accepted').length
      if (k === 0) return state
      const actor = action.actorPersonId ?? 'operator'
      if (actor !== 'operator') {
        const by = state.people[actor]
        if (!by || by.organizationId !== c.organizationId || !by.roles.includes('admin') || by.id === person.id) return state
      }
      const d = clone(state)
      if (actor === 'operator') pushLog(d, c.id, 'operator', `Nudged ${person.name} about ${k} outstanding items.`)
      else pushLog(d, c.id, actorName(d, actor), `Reminded ${person.name} about ${k} outstanding items.`)
      return d
    }

    case 'case/approve': {
      const c = state.cases[action.caseId]
      if (!c || c.status === 'approved' || c.status === 'funded') return state
      if (!c.itemIds.every((id) => state.items[id].status === 'accepted')) return state
      const d = clone(state)
      patchCase(d, c.id, { status: 'approved', approvedAt: d.now })
      pushLog(d, c.id, 'operator', 'Case approved.')
      return d
    }

    case 'case/fund': {
      const c = state.cases[action.caseId]
      if (!c || c.status !== 'approved') return state
      const d = clone(state)
      patchCase(d, c.id, { status: 'funded', firstTransactionAt: d.now })
      pushLog(d, c.id, 'operator', 'First transaction funded.')
      return d
    }

    case 'nav':
      return { ...state, view: action.view }

    case 'demo/switchPerson': {
      if (action.personId === null) return { ...state, activePersonId: null, view: { kind: 'console' } }
      const person = state.people[action.personId]
      if (!person) return state
      const preferred = state.view.kind === 'case' || state.view.kind === 'parcel' ? state.view.caseId : null
      const hasParcel = (caseId: string) => state.cases[caseId].parcelIds.some((pid) => state.parcels[pid].personId === person.id)
      let caseId: string | null = preferred && hasParcel(preferred) ? preferred : null
      if (!caseId) {
        const mine = Object.values(state.cases)
          .filter((c) => c.organizationId === person.organizationId)
          .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
        caseId = mine[0]?.id ?? null
      }
      if (!caseId) return { ...state, activePersonId: person.id, view: { kind: 'console' } }
      return { ...state, activePersonId: person.id, view: { kind: 'parcel', personId: person.id, caseId } }
    }

    case 'sys/setNow':
      return { ...state, now: action.now }

    case 'reset':
      // Handled by the store, which owns buildSeed(); the reducer stays free of seed imports.
      return state

    case 'case/addCollaborator': {
      const c = state.cases[action.caseId]
      if (!c) return state
      const org = state.orgs[c.organizationId]
      const { draft } = action
      const name = draft.name.trim()
      const email = draft.email.trim()
      if (!name || !email || draft.roles.length === 0) return state
      if (org.personIds.some((id) => state.people[id].email.toLowerCase() === email.toLowerCase())) return state
      if (draft.roles.includes('ubo') && !(draft.ownershipPercent! >= 1 && draft.ownershipPercent! <= 100)) return state

      const d = clone(state)
      const actor = actorName(d, action.actorPersonId)
      const person: Person = {
        id: nextId(d, 'per'),
        organizationId: org.id,
        name,
        email,
        roles: draft.roles,
        jurisdiction: draft.jurisdiction,
        ownershipPercent: draft.roles.includes('ubo') ? draft.ownershipPercent : undefined,
      }
      d.people[person.id] = person
      d.orgs[org.id] = { ...org, personIds: [...org.personIds, person.id] }
      pushLog(d, c.id, actor, `Added ${name} (${draft.roles.map((r) => ROLE_LABEL[r]).join('/')}, ${draft.jurisdiction}).`)

      // 2. Person-level items for subjects.
      const own = instantiatePerson((p) => nextId(d, p), person, c.id)

      // 3. Ownership chart once there are two or more owners.
      const admin = adminOf(d.orgs[org.id], d.people)
      const uboCount = d.orgs[org.id].personIds.filter((id) => d.people[id].roles.includes('ubo')).length
      if (draft.roles.includes('ubo') && uboCount >= 2 && !c.itemIds.some((id) => d.items[id].requirementKey === 'ownership_chart')) {
        const assigneeId = assigneeFor({ subjectKind: 'organization', subjectId: org.id }, d.orgs[org.id], d.entities, admin.id)
        const target = primaryParcelOf(d, c.id, assigneeId) ?? createParcel(d, c.id, assigneeId)
        const chart: Item = {
          id: nextId(d, 'item'),
          caseId: c.id,
          requirementKey: 'ownership_chart',
          subjectKind: 'organization',
          subjectId: org.id,
          assignedPersonId: assigneeId,
          status: 'not_started',
          originParcelId: target.id,
        }
        addItemsToParcel(d, target.id, [chart])
        syncParcel(d, target.id)
        pushLog(d, c.id, actor, `Added Ownership structure chart to ${d.people[assigneeId].name}'s request (two or more owners).`)
      }

      // 4. Delegation: point subjects at the new person and move their movable items.
      const delegated: { kind: SubjectKind; id: string }[] = []
      if (action.delegateFor.org) delegated.push({ kind: 'organization', id: org.id })
      action.delegateFor.entityIds.filter((eid) => d.entities[eid]?.organizationId === org.id).forEach((eid) => delegated.push({ kind: 'legalEntity', id: eid }))
      let parcel: Parcel | undefined
      const ensureParcel = () => (parcel ??= createParcel(d, c.id, person.id))
      for (const sub of delegated) {
        if (sub.kind === 'organization') d.orgs[org.id] = { ...d.orgs[org.id], delegatePersonId: person.id }
        else d.entities[sub.id] = { ...d.entities[sub.id], delegatePersonId: person.id }
        const movable = c.itemIds
          .map((id) => d.items[id])
          .filter(
            (it) =>
              it.subjectKind === sub.kind && it.subjectId === sub.id && OUTSTANDING.includes(it.status) && !d.parcels[it.originParcelId]?.isReRequest,
          )
        if (movable.length > 0) {
          const target = ensureParcel()
          movable.forEach((it) => moveItem(d, it.id, target.id, person.id))
        }
        pushLog(d, c.id, actor, `Delegated ${movable.length} items for ${subject(d, { subjectKind: sub.kind, subjectId: sub.id })} to ${name}.`)
      }

      // 5. The new person's own items and their request.
      if (own.length > 0) addItemsToParcel(d, ensureParcel().id, own)
      if (parcel) {
        syncParcel(d, parcel.id)
        pushLog(d, c.id, actor, `Request sent to ${name} (${d.parcels[parcel.id].itemIds.length} items).`)
      }

      // 6, 7. Tier and case status.
      recomputeTier(d, c.id, actor)
      syncCase(d, c.id)
      return d
    }

    case 'case/addEntity': {
      const c = state.cases[action.caseId]
      const legalName = action.legalName.trim()
      if (!c || !legalName) return state
      const org = state.orgs[c.organizationId]
      if (action.delegatePersonId && !org.personIds.includes(action.delegatePersonId)) return state
      const d = clone(state)
      const actor = actorName(d, action.actorPersonId)
      const entity: LegalEntity = {
        id: nextId(d, 'ent'),
        organizationId: org.id,
        legalName,
        jurisdiction: action.jurisdiction,
        isPrimary: false,
        delegatePersonId: action.delegatePersonId,
      }
      d.entities[entity.id] = entity
      d.orgs[org.id] = { ...org, legalEntityIds: [...org.legalEntityIds, entity.id] }
      const items = instantiateEntity((p) => nextId(d, p), d.orgs[org.id], entity, c.id)
      const admin = adminOf(d.orgs[org.id], d.people)
      const assigneeId = action.delegatePersonId ?? admin.id
      const target = primaryParcelOf(d, c.id, assigneeId) ?? createParcel(d, c.id, assigneeId)
      addItemsToParcel(d, target.id, items)
      syncParcel(d, target.id)
      pushLog(d, c.id, actor, `Added ${legalName} (${entity.jurisdiction}): ${items.length} items assigned to ${d.people[assigneeId].name}.`)
      recomputeTier(d, c.id, actor)
      syncCase(d, c.id)
      return d
    }

    default:
      return state
  }
}

// ---- Previews (v2): run the real reducer, diff, never dispatch. ----

export interface Preview {
  newItemCount: number
  movedItemCount: number
  movedFromName: string | null
  ownershipChartAdded: boolean
  newParcel: boolean
  tierBefore: AppState['cases'][string]['tier']
  tierAfter: AppState['cases'][string]['tier']
  valid: boolean
}

export function preview(state: AppState, action: Extract<Action, { type: 'case/addCollaborator' | 'case/addEntity' }>): Preview {
  const after = reducer(state, action)
  const before = state.cases[action.caseId]
  const afterCase = after.cases[action.caseId]
  const valid = after !== state
  const newItemIds = afterCase.itemIds.filter((id) => !state.items[id])
  const ownershipChartAdded = newItemIds.some((id) => after.items[id].requirementKey === 'ownership_chart')
  const moved = before.itemIds.filter((id) => state.items[id].originParcelId !== after.items[id].originParcelId)
  const movedFromName = moved.length ? state.people[state.items[moved[0]].assignedPersonId]?.name ?? null : null
  return {
    newItemCount: newItemIds.length - (ownershipChartAdded ? 1 : 0),
    movedItemCount: moved.length,
    movedFromName,
    ownershipChartAdded,
    newParcel: afterCase.parcelIds.length > before.parcelIds.length,
    tierBefore: before.tier,
    tierAfter: afterCase.tier,
    valid,
  }
}
