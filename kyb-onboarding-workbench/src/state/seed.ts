// The seed is a replayed script: fixtures plus a fixed list of ordinary
// actions run through the real reducer. It can never disagree with the rules.
import type { AppState, Item, LegalEntity, Organization, Person, RequirementKey, TriageAnswers } from '../model/types'
import { reducer, type Action } from './reducer'

export { EIN_LOOKUP } from '../model/registry'

export const NOW = '2026-09-03T09:00:00Z'
const DAY = 86_400_000

/** v2 seeds a document holder on Northwind. v1 builds without her. */
export const SEED_WITH_DELEGATE = true

export const EMPTY_STATE: AppState = {
  orgs: {},
  entities: {},
  people: {},
  cases: {},
  items: {},
  parcels: {},
  log: [],
  view: { kind: 'console' },
  activePersonId: null,
  now: NOW,
  seq: 0,
}

export interface Fixture {
  org: Organization
  entities: LegalEntity[]
  people: Person[]
  answers: TriageAnswers
}

export const ACME: Fixture = {
  org: {
    id: 'org_acme',
    legalName: 'Acme Fabrication LLC',
    ein: '61-1234567',
    primaryJurisdiction: 'US',
    operatingJurisdictions: ['US'],
    isMoneyServicesBusiness: false,
    legalEntityIds: ['ent_acme'],
    personIds: ['per_acme_jordan'],
  },
  entities: [{ id: 'ent_acme', organizationId: 'org_acme', legalName: 'Acme Fabrication LLC', jurisdiction: 'US', isPrimary: true }],
  people: [
    {
      id: 'per_acme_jordan',
      organizationId: 'org_acme',
      name: 'Jordan Reyes',
      email: 'jordan@acmefab.example',
      roles: ['admin', 'ubo'],
      jurisdiction: 'US',
      ownershipPercent: 100,
    },
  ],
  answers: { entityBand: '1', uboBand: '1', jurisdictions: ['US'], isMsb: false },
}

export const NORTHWIND: Fixture = {
  org: {
    id: 'org_nw',
    legalName: 'Northwind Digital Ltd',
    ein: '82-7654321',
    primaryJurisdiction: 'US',
    operatingJurisdictions: ['US', 'SG', 'MX', 'BR'],
    isMoneyServicesBusiness: true,
    legalEntityIds: ['ent_nw_us', 'ent_nw_sg', 'ent_nw_mx', 'ent_nw_br'],
    personIds: ['per_nw_admin', 'per_nw_officer', 'per_nw_ubo1', 'per_nw_ubo2', 'per_nw_ubo_sg', 'per_nw_ubo_br'],
  },
  entities: [
    { id: 'ent_nw_us', organizationId: 'org_nw', legalName: 'Northwind Digital Inc.', jurisdiction: 'US', isPrimary: true },
    { id: 'ent_nw_sg', organizationId: 'org_nw', legalName: 'Northwind Digital Asia Pte. Ltd.', jurisdiction: 'SG', isPrimary: false },
    { id: 'ent_nw_mx', organizationId: 'org_nw', legalName: 'Northwind Digital México S.A. de C.V.', jurisdiction: 'MX', isPrimary: false },
    { id: 'ent_nw_br', organizationId: 'org_nw', legalName: 'Northwind Digital Brasil Ltda.', jurisdiction: 'BR', isPrimary: false },
  ],
  people: [
    { id: 'per_nw_admin', organizationId: 'org_nw', name: 'Dana Whitfield', email: 'dana@northwind.example', roles: ['admin'], jurisdiction: 'US' },
    { id: 'per_nw_officer', organizationId: 'org_nw', name: 'Marcus Bell', email: 'marcus@northwind.example', roles: ['officer'], jurisdiction: 'US' },
    { id: 'per_nw_ubo1', organizationId: 'org_nw', name: 'Elena Sokolova', email: 'elena@northwind.example', roles: ['ubo'], jurisdiction: 'US', ownershipPercent: 25 },
    { id: 'per_nw_ubo2', organizationId: 'org_nw', name: 'Tom Nakamura', email: 'tom@northwind.example', roles: ['ubo'], jurisdiction: 'US', ownershipPercent: 25 },
    { id: 'per_nw_ubo_sg', organizationId: 'org_nw', name: 'Mei Lin Tan', email: 'meilin@northwind.example', roles: ['ubo'], jurisdiction: 'SG', ownershipPercent: 25 },
    { id: 'per_nw_ubo_br', organizationId: 'org_nw', name: 'Rafael Costa', email: 'rafael@northwind.example', roles: ['ubo'], jurisdiction: 'BR', ownershipPercent: 25 },
  ],
  answers: { entityBand: '4+', uboBand: '4+', jurisdictions: ['US', 'SG', 'MX', 'BR'], isMsb: true },
}

const ENTITY_SLUG: Record<string, string> = { ent_nw_us: 'us', ent_nw_sg: 'sg', ent_nw_mx: 'mx', ent_nw_br: 'br' }

/** Re-id a fixture so a triage preset can create a second case alongside the seeded one. */
export function reidFixture(f: Fixture, seq: () => number): Fixture {
  const orgId = `org_${seq()}`
  const entityIds = new Map(f.entities.map((e) => [e.id, `ent_${seq()}`]))
  const personIds = new Map(f.people.map((p) => [p.id, `per_${seq()}`]))
  return {
    org: {
      ...f.org,
      id: orgId,
      legalEntityIds: f.org.legalEntityIds.map((id) => entityIds.get(id)!),
      personIds: f.org.personIds.map((id) => personIds.get(id)!),
    },
    entities: f.entities.map((e) => ({ ...e, id: entityIds.get(e.id)!, organizationId: orgId })),
    people: f.people.map((p) => ({ ...p, id: personIds.get(p.id)!, organizationId: orgId })),
    answers: f.answers,
  }
}

function findItem(s: AppState, caseId: string, key: RequirementKey, subjectId: string): Item {
  const it = s.cases[caseId].itemIds.map((id) => s.items[id]).find((i) => i.requirementKey === key && i.subjectId === subjectId)
  if (!it) throw new Error(`Seed: no item ${key} for ${subjectId}`)
  return it
}

export function buildSeed(): AppState {
  let s = EMPTY_STATE
  let step = 0
  const run = (a: Action) => {
    const next = reducer(s, a)
    if (next === s && a.type !== 'sys/setNow') throw new Error(`Seed step rejected: ${a.type} ${JSON.stringify(a).slice(0, 120)}`)
    s = next
  }
  const day = (daysAgo: number) => {
    step += 1
    run({ type: 'sys/setNow', now: new Date(Date.parse(NOW) - daysAgo * DAY - 60 * 60_000 + step * 60_000).toISOString() })
  }
  const provide = (caseId: string, actor: string, key: RequirementKey, subjectId: string, value: string) =>
    run({ type: 'item/provide', itemId: findItem(s, caseId, key, subjectId).id, value, actorPersonId: actor })

  // ---- Acme ----
  day(3)
  run({ type: 'triage/confirm', answers: ACME.answers, org: ACME.org, entities: ACME.entities, people: ACME.people })
  const acme = (s.view as { caseId: string }).caseId
  day(2)
  const acmeProvided: [RequirementKey, string, string][] = [
    ['business_description', 'org_acme', 'Custom metal fabrication for commercial HVAC contractors'],
    ['expected_volumes', 'org_acme', '$180,000 per month'],
    ['source_of_funds', 'org_acme', 'acme-source-of-funds.pdf'],
    ['bank_account', 'org_acme', 'Republic Bank ····4471 (connected)'],
    ['certificate_of_incorporation', 'ent_acme', 'acme-certificate.pdf'],
    ['articles_of_incorporation', 'ent_acme', 'acme-articles.pdf'],
    ['entity_good_standing', 'ent_acme', 'ky-good-standing-2026.pdf'],
    ['proof_of_address', 'per_acme_jordan', 'jordan-utility-aug.pdf'],
    ['tax_id', 'per_acme_jordan', 'provided'],
    ['ownership_percent', 'per_acme_jordan', '100'],
  ]
  acmeProvided.forEach(([key, subj, value]) => provide(acme, 'per_acme_jordan', key, subj, value))
  day(2)
  provide(acme, 'per_acme_jordan', 'identity_document', 'per_acme_jordan', 'jordan-passport.jpg')
  day(1)
  acmeProvided.forEach(([key, subj]) => run({ type: 'item/accept', itemId: findItem(s, acme, key, subj).id }))

  // ---- Northwind ----
  day(21)
  run({ type: 'triage/confirm', answers: NORTHWIND.answers, org: NORTHWIND.org, entities: NORTHWIND.entities, people: NORTHWIND.people })
  const nw = (s.view as { caseId: string }).caseId
  if (SEED_WITH_DELEGATE) {
    day(21)
    run({
      type: 'case/addCollaborator',
      caseId: nw,
      actorPersonId: 'per_nw_admin',
      draft: { name: 'Lucía Herrera', email: 'lucia@herrera-contadores.example', roles: ['advisor'], jurisdiction: 'MX' },
      delegateFor: { org: false, entityIds: ['ent_nw_mx'] },
    })
  }
  day(19)
  ;(['legal_name', 'ein', 'registered_address'] as RequirementKey[]).forEach((key) =>
    run({ type: 'item/confirm', itemId: findItem(s, nw, key, 'org_nw').id, actorPersonId: 'per_nw_admin' }),
  )
  day(19)
  ;(['entity_registration_number', 'entity_registered_address'] as RequirementKey[]).forEach((key) =>
    run({ type: 'item/confirm', itemId: findItem(s, nw, key, 'ent_nw_us').id, actorPersonId: 'per_nw_admin' }),
  )
  day(19)
  const orgValues: Partial<Record<RequirementKey, string>> = {
    business_description: 'Cross-border payouts for marketplace sellers',
    expected_volumes: '$4.2M per month',
    source_of_funds: 'northwind-source-of-funds.pdf',
    bank_account: 'Partner bank operating account ····0912 (connected)',
    ownership_chart: 'northwind-ownership-chart.pdf',
    msb_license: 'fincen-msb-registration.pdf',
  }
  const entityValue = (key: RequirementKey, entityId: string): string => {
    const slug = ENTITY_SLUG[entityId]
    const suffix: Partial<Record<RequirementKey, string>> = {
      certificate_of_incorporation: 'certificate.pdf',
      articles_of_incorporation: 'articles.pdf',
      entity_good_standing: 'good-standing.pdf',
      entity_registration_number: 'registration.pdf',
      entity_registered_address: 'address.pdf',
    }
    return `${slug}-${suffix[key]}`
  }
  const danaOwn: Partial<Record<RequirementKey, string>> = {
    identity_document: 'dana-passport.jpg',
    proof_of_address: 'dana-utility.pdf',
    tax_id: 'provided',
  }
  const danaParcel = s.cases[nw].parcelIds.map((id) => s.parcels[id]).find((p) => p.personId === 'per_nw_admin')!
  for (const itemId of danaParcel.itemIds) {
    const it = s.items[itemId]
    if (it.status !== 'not_started') continue
    const value =
      it.subjectKind === 'organization'
        ? orgValues[it.requirementKey]!
        : it.subjectKind === 'legalEntity'
          ? entityValue(it.requirementKey, it.subjectId)
          : danaOwn[it.requirementKey]!
    run({ type: 'item/provide', itemId, value, actorPersonId: 'per_nw_admin' })
  }
  day(19)
  run({ type: 'parcel/submit', parcelId: danaParcel.id, actorPersonId: 'per_nw_admin' })

  const personSubmit = (daysAgo: number, pid: string, values: [RequirementKey, string][]) => {
    day(daysAgo)
    values.forEach(([key, value]) => provide(nw, pid, key, pid, value))
    const parcel = s.cases[nw].parcelIds.map((id) => s.parcels[id]).find((p) => p.personId === pid)!
    run({ type: 'parcel/submit', parcelId: parcel.id, actorPersonId: pid })
  }
  personSubmit(18, 'per_nw_officer', [
    ['identity_document', 'marcus-passport.jpg'],
    ['proof_of_address', 'marcus-bank-stmt.pdf'],
    ['tax_id', 'provided'],
    ['officer_authorization', 'board-resolution-2026.pdf'],
  ])
  personSubmit(18, 'per_nw_ubo1', [
    ['identity_document', 'elena-passport.jpg'],
    ['proof_of_address', 'elena-utility.pdf'],
    ['tax_id', 'provided'],
    ['ownership_percent', '25'],
  ])
  personSubmit(17, 'per_nw_ubo2', [
    ['identity_document', 'tom-drivers-license.jpg'],
    ['proof_of_address', 'tom-utility.pdf'],
    ['tax_id', 'provided'],
    ['ownership_percent', '25'],
  ])

  day(14)
  const sgArticles = findItem(s, nw, 'articles_of_incorporation', 'ent_nw_sg').id
  const sgCertificate = findItem(s, nw, 'certificate_of_incorporation', 'ent_nw_sg').id
  s.cases[nw].itemIds
    .map((id) => s.items[id])
    .filter((it) => it.status === 'in_review' && it.id !== sgArticles && it.id !== sgCertificate)
    .forEach((it) => run({ type: 'item/accept', itemId: it.id }))

  day(6)
  run({
    type: 'item/moreInfo',
    itemId: sgArticles,
    note:
      'The Singapore articles exist only as a paper original from 2004, held by the corporate secretary. Our banking partner needs them in a verifiable digital form, such as a certified true copy. A scan of the original is not enough.',
  })
  day(6)
  run({ type: 'item/moreInfo', itemId: sgCertificate, note: 'Banking partner requires a certified copy issued within the last 90 days.' })
  day(6)
  run({
    type: 'case/raiseReRequest',
    caseId: nw,
    raisedBy: 'bank_partner',
    reason: 'Certified incorporation documents for the Singapore subsidiary before the account can be opened.',
    recipientPersonId: 'per_nw_ubo_sg',
    newItems: [],
    moveItemIds: [sgArticles, sgCertificate],
  })
  day(4)
  run({ type: 'case/nudge', caseId: nw, personId: 'per_nw_ubo_br' })

  // ---- Back to the present, on the console. ----
  s = { ...s, now: NOW, view: { kind: 'console' }, activePersonId: null }

  if (import.meta.env.DEV) {
    const count = (caseId: string, pred: (it: Item) => boolean) => s.cases[caseId].itemIds.map((id) => s.items[id]).filter(pred).length
    console.assert(s.cases[acme].itemIds.length === 16, 'Acme should have 16 items')
    console.assert(s.cases[acme].parcelIds.length === 1, 'Acme should have 1 parcel')
    console.assert(count(acme, (it) => it.status !== 'accepted') === 6, 'Acme should have 6 outstanding')
    console.assert(s.cases[nw].itemIds.length === 52, 'Northwind should have 52 items')
    console.assert(s.cases[nw].parcelIds.length === (SEED_WITH_DELEGATE ? 8 : 7), `Northwind parcel count: ${s.cases[nw].parcelIds.length}`)
    const rr = s.cases[nw].parcelIds.map((id) => s.parcels[id]).find((p) => p.isReRequest)
    console.assert(rr?.itemIds.length === 2, 'Re-request parcel should hold 2 items')
    console.assert(count(nw, (it) => it.status === 'accepted') === (SEED_WITH_DELEGATE ? 37 : 42), `Northwind accepted count: ${count(nw, (it) => it.status === 'accepted')} in_review ${count(nw, (it) => it.status === 'in_review')} provided ${count(nw, (it) => it.status === 'provided')} not_started ${count(nw, (it) => it.status === 'not_started')}`)
    console.assert(s.cases[nw].status === 'more_info_needed', 'Northwind should be more_info_needed')
  }
  return s
}
