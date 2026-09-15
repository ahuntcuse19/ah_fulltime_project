// Plain-object mirrors of SPEC.md Section 4 (plus A3, A6, A9).
// The engine only ever sees these shapes; no database types leak in.

export type OrgType = "club" | "college" | "high_school" | "community_program";
export type SkillTier = "novice" | "intermediate" | "competitive";
export type AssetClass =
  | "shell_1x"
  | "shell_2x"
  | "shell_2-"
  | "shell_4x"
  | "shell_4+"
  | "shell_8+"
  | "oar_set_sweep"
  | "oar_set_scull";
export type AssetStatus = "on_water" | "caution" | "off_water" | "retired";
export type EntitlementKind = "standing" | "eligible";
export type Slot = "AM1" | "AM2" | "PM1";
export type SessionSource = "standing" | "form" | "intake";
export type SessionStatus =
  | "requested"
  | "allocated"
  | "partially_allocated"
  | "unfilled"
  | "cancelled";
export type AllocationBasis = "standing" | "priority" | "manual";
export type Component =
  | "hull"
  | "rigger"
  | "oarlock"
  | "seat_slide"
  | "foot_stretcher"
  | "fin_skeg"
  | "oar"
  | "other";
export type Severity = "cosmetic" | "caution" | "off_water";
export type DamageStatus = "open" | "parts_ordered" | "fixed";
export type ProgramType = "mens" | "womens" | "mixed";

/** ISO calendar date, YYYY-MM-DD, interpreted in America/New_York. */
export type IsoDate = string;

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  priority_tier: number;
  default_skill_tier: SkillTier;
  annual_fee_cents: number;
}

export interface Asset {
  id: string;
  name: string;
  asset_class: AssetClass;
  seats: number;
  quality_tier: SkillTier;
  owner_org_id: string | null;
  shared: boolean;
  year_built: number;
  purchase_cost_cents: number;
  replacement_cost_cents: number;
  donor_name: string | null;
  status: AssetStatus;
  rack_location: string;
  /** A9: date the retire toggle was turned on; null when not retired. */
  retired_on: IsoDate | null;
}

export interface Entitlement {
  id: string;
  org_id: string;
  asset_id: string;
  kind: EntitlementKind;
  slot: Slot | null;
  days: number[] | null;
}

export interface Session {
  id: string;
  org_id: string;
  date: IsoDate;
  slot: Slot;
  skill_tier: SkillTier;
  requested_seats: number;
  source: SessionSource;
  raw_request_text: string | null;
  status: SessionStatus;
  /** ISO 8601 timestamp string; compared lexically after normalisation to UTC. */
  created_at: string;
  /** A6 */
  program: ProgramType | null;
}

export interface Allocation {
  id: string;
  session_id: string;
  asset_id: string;
  basis: AllocationBasis;
  approved: boolean;
  overridden_from_asset_id: string | null;
  override_reason: string | null;
}

export interface DamageEvent {
  id: string;
  asset_id: string;
  reported_on: IsoDate;
  reported_by_org_id: string | null;
  liable_org_id: string | null;
  component: Component;
  description: string;
  severity: Severity;
  status: DamageStatus;
  resolved_on: IsoDate | null;
  cost_cents: number;
}

export interface Part {
  id: string;
  name: string;
  component: Component;
  qty_in_stock: number;
  qty_on_order: number;
  unit_cost_cents: number;
  reorder_threshold: number;
}

export interface DamageEventPart {
  damage_event_id: string;
  part_id: string;
  qty_used: number;
}

export interface BoatReportNote {
  asset_id: string;
  text: string;
  updated_at: string;
}

export const SLOTS: readonly Slot[] = ["AM1", "AM2", "PM1"];
export const SLOT_ORDER: Record<Slot, number> = { AM1: 0, AM2: 1, PM1: 2 };

export const SHELL_CLASSES: readonly AssetClass[] = [
  "shell_1x",
  "shell_2x",
  "shell_2-",
  "shell_4x",
  "shell_4+",
  "shell_8+",
];

export const SEATS_BY_CLASS: Record<AssetClass, number> = {
  shell_1x: 1,
  shell_2x: 2,
  "shell_2-": 2,
  shell_4x: 4,
  "shell_4+": 4,
  "shell_8+": 8,
  oar_set_sweep: 8,
  oar_set_scull: 2,
};

export function isShellClass(c: AssetClass): boolean {
  return c.startsWith("shell_");
}

export function isOarSetClass(c: AssetClass): boolean {
  return c.startsWith("oar_set_");
}
