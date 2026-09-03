// The fake EIN registry. This is the ONLY source of pre-filled values.
// An EIN is a US identifier, so entity lookups are only available for US
// entities; a real lookup could not return a Singapore registration number.

export interface RegistryEntity {
  registrationNumber: string
  registeredAddress: string
}

export interface RegistryRecord {
  legalName: string
  registeredAddress: string
  entities: Record<string, RegistryEntity> // keyed by LegalEntity id
}

export const EIN_LOOKUP: Record<string, RegistryRecord> = {
  '61-1234567': {
    legalName: 'Acme Fabrication LLC',
    registeredAddress: '1420 Industrial Pkwy, Louisville, KY 40210',
    entities: {
      ent_acme: { registrationNumber: 'KY-0871234', registeredAddress: '1420 Industrial Pkwy, Louisville, KY 40210' },
    },
  },
  '82-7654321': {
    legalName: 'Northwind Digital Ltd',
    registeredAddress: '600 Congress Ave, Austin, TX 78701',
    entities: {
      ent_nw_us: { registrationNumber: 'TX-0402211', registeredAddress: '600 Congress Ave, Austin, TX 78701' },
    },
  },
}
