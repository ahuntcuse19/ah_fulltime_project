// Small builders for engine tests. Not used by the app.

import type {
  Allocation,
  Asset,
  AssetClass,
  DamageEvent,
  Entitlement,
  Organization,
  Session,
  SkillTier,
  Slot,
} from "./types";
import { SEATS_BY_CLASS } from "./types";

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

export function resetIds(): void {
  counter = 0;
}

export function org(over: Partial<Organization> & { id?: string } = {}): Organization {
  return {
    id: over.id ?? nextId("org"),
    name: over.name ?? "Org",
    type: over.type ?? "club",
    priority_tier: over.priority_tier ?? 2,
    default_skill_tier: over.default_skill_tier ?? "intermediate",
    annual_fee_cents: over.annual_fee_cents ?? 0,
  };
}

export function asset(
  asset_class: AssetClass,
  quality_tier: SkillTier,
  year_built: number,
  over: Partial<Asset> = {},
): Asset {
  return {
    id: over.id ?? nextId("asset"),
    name: over.name ?? `${asset_class} ${year_built}`,
    asset_class,
    seats: SEATS_BY_CLASS[asset_class],
    quality_tier,
    owner_org_id: over.owner_org_id ?? null,
    shared: over.shared ?? true,
    year_built,
    purchase_cost_cents: over.purchase_cost_cents ?? 0,
    replacement_cost_cents: over.replacement_cost_cents ?? 100_000,
    donor_name: over.donor_name ?? null,
    status: over.status ?? "on_water",
    rack_location: over.rack_location ?? "Bay 1",
    retired_on: over.retired_on ?? null,
  };
}

export function eligible(orgId: string, assetId: string): Entitlement {
  return { id: nextId("ent"), org_id: orgId, asset_id: assetId, kind: "eligible", slot: null, days: null };
}

export function standing(orgId: string, assetId: string, slot: Slot, days: number[]): Entitlement {
  return { id: nextId("ent"), org_id: orgId, asset_id: assetId, kind: "standing", slot, days };
}

export function session(
  orgId: string,
  date: string,
  slot: Slot,
  skill_tier: SkillTier,
  requested_seats: number,
  over: Partial<Session> = {},
): Session {
  return {
    id: over.id ?? nextId("session"),
    org_id: orgId,
    date,
    slot,
    skill_tier,
    requested_seats,
    source: over.source ?? "standing",
    raw_request_text: null,
    status: over.status ?? "requested",
    created_at: over.created_at ?? "2026-03-02T05:00:00.000Z",
    program: over.program ?? "mixed",
  };
}

export function damage(
  assetId: string,
  reported_on: string,
  severity: DamageEvent["severity"],
  status: DamageEvent["status"],
  resolved_on: string | null,
  cost_cents = 0,
  over: Partial<DamageEvent> = {},
): DamageEvent {
  return {
    id: over.id ?? nextId("dmg"),
    asset_id: assetId,
    reported_on,
    reported_by_org_id: null,
    liable_org_id: over.liable_org_id ?? null,
    component: over.component ?? "hull",
    description: over.description ?? "",
    severity,
    status,
    resolved_on,
    cost_cents,
  };
}

export function allocation(
  session_id: string,
  asset_id: string,
  basis: Allocation["basis"],
  approved = false,
): Allocation {
  return {
    id: nextId("alloc"),
    session_id,
    asset_id,
    basis,
    approved,
    overridden_from_asset_id: null,
    override_reason: null,
  };
}
