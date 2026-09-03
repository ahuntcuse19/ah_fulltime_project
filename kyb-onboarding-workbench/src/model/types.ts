// The information model. Everything else in the app derives from these types.
// Deviations from the build spec are marked with "spec deviation".

export type Jurisdiction = 'US' | 'SG' | 'MX' | 'BR' | 'GB' | 'DE'
export const JURISDICTIONS: Jurisdiction[] = ['US', 'SG', 'MX', 'BR', 'GB', 'DE']

export type Tier = 'simple' | 'standard' | 'complex'

export interface Organization {
  id: string
  legalName: string
  ein?: string // presence of an EIN enables pre-population
  primaryJurisdiction: Jurisdiction
  operatingJurisdictions: Jurisdiction[] // spec deviation: from triage Q3, drives tier
  isMoneyServicesBusiness: boolean
  legalEntityIds: string[]
  personIds: string[]
  delegatePersonId?: string // spec deviation (v2): who holds org-level documents
}

export interface LegalEntity {
  id: string
  organizationId: string
  legalName: string
  jurisdiction: Jurisdiction
  isPrimary: boolean
  delegatePersonId?: string // spec deviation (v2): who holds this entity's documents
}

export type PersonRole = 'ubo' | 'officer' | 'admin' | 'advisor'

export interface Person {
  id: string
  organizationId: string
  name: string
  email: string
  roles: PersonRole[] // spec deviation: a person can hold several roles
  jurisdiction: Jurisdiction
  ownershipPercent?: number // only meaningful when roles include 'ubo'
}

export type SubjectKind = 'organization' | 'legalEntity' | 'person'

export type RequirementKey =
  | 'legal_name'
  | 'ein'
  | 'registered_address'
  | 'business_description'
  | 'expected_volumes'
  | 'source_of_funds'
  | 'bank_account'
  | 'ownership_chart'
  | 'msb_license'
  | 'certificate_of_incorporation'
  | 'articles_of_incorporation'
  | 'entity_registration_number'
  | 'entity_registered_address'
  | 'entity_good_standing'
  | 'identity_document'
  | 'proof_of_address'
  | 'tax_id'
  | 'ownership_percent'
  | 'officer_authorization'

export interface Requirement {
  key: RequirementKey
  label: string
  helpText: string
  subjectKind: SubjectKind
  autoPopulatable: boolean // can be derived from the EIN lookup
  sensitive: boolean // affects presentation only
  provenance: 'named' | 'assumed' // spec deviation: named by Stable Sea vs assumed
  inputKind: 'file' | 'text'
}

export type ItemStatus =
  | 'not_started'
  | 'prefilled_unconfirmed'
  | 'provided'
  | 'in_review'
  | 'accepted'
  | 'more_info_needed'

export interface Item {
  id: string
  caseId: string
  requirementKey: RequirementKey
  subjectKind: SubjectKind
  subjectId: string
  assignedPersonId: string // who can actually satisfy this
  status: ItemStatus
  value?: string // filename or typed value
  reviewerNote?: string // set when status is more_info_needed
  originParcelId: string
}

export type ParcelStatus = 'not_sent' | 'sent' | 'in_progress' | 'submitted' | 'complete'

export interface Parcel {
  id: string
  caseId: string
  personId: string
  itemIds: string[]
  status: ParcelStatus
  token: string // fake magic-link token
  isReRequest: boolean
  raisedBy?: DownstreamParty
  reason?: string
  submittedAt?: string // spec deviation: lets parcel status be derived from items
}

export type DownstreamParty = 'internal_compliance' | 'bank_partner' | 'asset_manager'

export type CaseStatus =
  | 'triage'
  | 'collecting'
  | 'in_review'
  | 'more_info_needed'
  | 'approved'
  | 'funded'

export interface Case {
  id: string
  organizationId: string
  tier: Tier
  status: CaseStatus
  createdAt: string
  approvedAt?: string
  firstTransactionAt?: string
  parcelIds: string[]
  itemIds: string[]
}

export interface EventLogEntry {
  id: string
  caseId: string
  at: string
  actor: string // 'operator' | person name | downstream party label
  message: string
}

// ---- App-level types (not part of the domain model) ----

export type View =
  | { kind: 'console' }
  | { kind: 'triage' }
  | { kind: 'case'; caseId: string }
  | { kind: 'parcel'; personId: string; caseId: string }

export type CountBand = '1' | '2-3' | '4+'

export interface TriageAnswers {
  entityBand: CountBand
  uboBand: CountBand
  jurisdictions: Jurisdiction[]
  isMsb: boolean
}

export interface AppState {
  orgs: Record<string, Organization>
  entities: Record<string, LegalEntity>
  people: Record<string, Person>
  cases: Record<string, Case>
  items: Record<string, Item>
  parcels: Record<string, Parcel>
  log: EventLogEntry[] // append-only, oldest first
  view: View
  activePersonId: string | null // demo person-switcher
  now: string // ISO; the only clock the reducer reads
  seq: number // id counter, so ids are deterministic and StrictMode-safe
}
