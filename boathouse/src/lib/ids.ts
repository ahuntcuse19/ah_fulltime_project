// Deterministic ids: uuid v5 from a fixed namespace and the row's natural key.
// Two seed runs produce identical ids. Runtime-created rows (intake sessions,
// UI damage events) use the same scheme where a natural key exists, else random v4.

import { v4 as uuidv4, v5 as uuidv5 } from "uuid";

export const ID_NAMESPACE = "3b1f7d5e-9c2a-4e6b-8f0d-1a2b3c4d5e6f";

export function idFor(kind: string, key: string): string {
  return uuidv5(`${kind}:${key}`, ID_NAMESPACE);
}

export const ids = {
  org: (name: string) => idFor("organization", name),
  asset: (name: string) => idFor("asset", name),
  entitlement: (orgId: string, assetId: string, kind: string, slot: string | null) =>
    idFor("entitlement", `${orgId}|${assetId}|${kind}|${slot ?? ""}`),
  session: (orgId: string, date: string, slot: string) => idFor("session", `${orgId}|${date}|${slot}`),
  allocation: (sessionId: string, assetId: string) => idFor("allocation", `${sessionId}|${assetId}`),
  damageEvent: (assetId: string, reportedOn: string, component: string, index: number) =>
    idFor("damage_event", `${assetId}|${reportedOn}|${component}|${index}`),
  part: (name: string) => idFor("part", name),
  random: () => uuidv4(),
};
