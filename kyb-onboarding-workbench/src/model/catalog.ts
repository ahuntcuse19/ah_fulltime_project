// The catalog of everything that can ever be asked for. Exactly the 19
// requirement types from the build spec, section 4.2. Nothing else.
import type {
  CaseStatus,
  DownstreamParty,
  ItemStatus,
  ParcelStatus,
  PersonRole,
  Requirement,
  RequirementKey,
  Tier,
} from './types'

export const REQUIREMENTS: Requirement[] = [
  // Organization-level
  { key: 'legal_name', label: 'Legal business name', helpText: 'The name the business is registered under.', subjectKind: 'organization', autoPopulatable: true, sensitive: false, provenance: 'assumed', inputKind: 'text' },
  { key: 'ein', label: 'EIN', helpText: 'The federal employer identification number.', subjectKind: 'organization', autoPopulatable: true, sensitive: false, provenance: 'assumed', inputKind: 'text' },
  { key: 'registered_address', label: 'Registered business address', helpText: 'The address on file with the state.', subjectKind: 'organization', autoPopulatable: true, sensitive: false, provenance: 'assumed', inputKind: 'text' },
  { key: 'business_description', label: 'Description of business activity', helpText: 'What the business does, in one or two sentences.', subjectKind: 'organization', autoPopulatable: false, sensitive: false, provenance: 'assumed', inputKind: 'text' },
  { key: 'expected_volumes', label: 'Expected monthly transaction volume', helpText: 'A rough figure is fine; it sets monitoring thresholds.', subjectKind: 'organization', autoPopulatable: false, sensitive: false, provenance: 'assumed', inputKind: 'text' },
  { key: 'source_of_funds', label: 'Source of funds statement', helpText: 'Where the money moving through the account comes from.', subjectKind: 'organization', autoPopulatable: false, sensitive: false, provenance: 'assumed', inputKind: 'file' },
  { key: 'bank_account', label: 'Operating bank account connection', helpText: 'Connect the account the business operates from.', subjectKind: 'organization', autoPopulatable: false, sensitive: false, provenance: 'named', inputKind: 'text' },
  { key: 'ownership_chart', label: 'Ownership structure chart', helpText: 'A diagram showing who owns what, down to the individuals.', subjectKind: 'organization', autoPopulatable: false, sensitive: false, provenance: 'assumed', inputKind: 'file' },
  { key: 'msb_license', label: 'Money services business license', helpText: 'The registration or license that lets the business transmit money.', subjectKind: 'organization', autoPopulatable: false, sensitive: false, provenance: 'named', inputKind: 'file' },
  // Legal-entity-level
  { key: 'certificate_of_incorporation', label: 'Certificate of incorporation', helpText: 'The document proving the entity exists.', subjectKind: 'legalEntity', autoPopulatable: false, sensitive: false, provenance: 'named', inputKind: 'file' },
  { key: 'articles_of_incorporation', label: 'Articles of incorporation', helpText: 'The founding document describing the entity and its purpose.', subjectKind: 'legalEntity', autoPopulatable: false, sensitive: false, provenance: 'named', inputKind: 'file' },
  { key: 'entity_registration_number', label: 'Local registration number', helpText: 'The number the local registry assigned to this entity.', subjectKind: 'legalEntity', autoPopulatable: true, sensitive: false, provenance: 'assumed', inputKind: 'text' },
  { key: 'entity_registered_address', label: 'Entity registered address', helpText: 'The address on file with the local registry.', subjectKind: 'legalEntity', autoPopulatable: true, sensitive: false, provenance: 'assumed', inputKind: 'text' },
  { key: 'entity_good_standing', label: 'Certificate of good standing', helpText: 'A recent confirmation from the registry that the entity is current.', subjectKind: 'legalEntity', autoPopulatable: false, sensitive: false, provenance: 'assumed', inputKind: 'file' },
  // Person-level
  { key: 'identity_document', label: 'Passport or government ID', helpText: 'A clear photo or scan of the identity page.', subjectKind: 'person', autoPopulatable: false, sensitive: true, provenance: 'named', inputKind: 'file' },
  { key: 'proof_of_address', label: 'Utility bill or bank statement', helpText: 'Dated within the last three months and showing your name and address.', subjectKind: 'person', autoPopulatable: false, sensitive: true, provenance: 'named', inputKind: 'file' },
  { key: 'tax_id', label: 'Tax identification number', helpText: 'Social Security number for US persons; national tax identifier elsewhere.', subjectKind: 'person', autoPopulatable: false, sensitive: true, provenance: 'named', inputKind: 'text' },
  { key: 'ownership_percent', label: 'Confirmed ownership percentage', helpText: 'Your share of the business, as a whole number.', subjectKind: 'person', autoPopulatable: false, sensitive: false, provenance: 'named', inputKind: 'text' },
  { key: 'officer_authorization', label: 'Signing authority confirmation', helpText: 'A board resolution or similar showing you can sign for the business.', subjectKind: 'person', autoPopulatable: false, sensitive: false, provenance: 'assumed', inputKind: 'file' },
]

export const REQ_BY_KEY: Record<RequirementKey, Requirement> = Object.fromEntries(
  REQUIREMENTS.map((r) => [r.key, r]),
) as Record<RequirementKey, Requirement>

export const CATALOG_ORDER: Record<RequirementKey, number> = Object.fromEntries(
  REQUIREMENTS.map((r, i) => [r.key, i]),
) as Record<RequirementKey, number>

export const SENSITIVE_LINE = (orgName: string) =>
  `Why: identity verification for beneficial owners and officers. Who sees it: the compliance reviewer and the banking partner. Not visible to anyone else at ${orgName}.`

// ---- Label maps: the single source for every chip and badge ----

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  not_started: 'Not started',
  prefilled_unconfirmed: 'Pre-filled, confirm',
  provided: 'Provided',
  in_review: 'In review',
  accepted: 'Accepted',
  more_info_needed: 'Needs more info',
}

export const PARCEL_STATUS_LABEL: Record<ParcelStatus, string> = {
  not_sent: 'Not sent',
  sent: 'Sent',
  in_progress: 'In progress',
  submitted: 'Submitted',
  complete: 'Complete',
}

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  triage: 'Triage',
  collecting: 'Collecting',
  in_review: 'In review',
  more_info_needed: 'More info needed',
  approved: 'Approved',
  funded: 'Funded',
}

export const TIER_LABEL: Record<Tier, string> = {
  simple: 'Simple',
  standard: 'Standard',
  complex: 'Complex',
}

export const PARTY_LABEL: Record<DownstreamParty, string> = {
  internal_compliance: 'Internal compliance',
  bank_partner: 'Bank partner',
  asset_manager: 'Asset manager',
}

// The customer-facing phrase: "One more thing from our {phrase}".
export const PARTY_PHRASE: Record<DownstreamParty, string> = {
  internal_compliance: 'compliance team',
  bank_partner: 'banking partner',
  asset_manager: 'asset manager',
}

export const ROLE_LABEL: Record<PersonRole, string> = {
  ubo: 'Beneficial owner',
  officer: 'Officer',
  admin: 'Admin',
  advisor: 'Document holder',
}

export const DOWNSTREAM_PARTIES: DownstreamParty[] = ['internal_compliance', 'bank_partner', 'asset_manager']
