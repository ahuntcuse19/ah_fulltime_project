// Section 8: reports and metrics, with A4 (denominator cutoff) and A6 (program split).

import type {
  Allocation,
  Asset,
  DamageEvent,
  IsoDate,
  Organization,
  ProgramType,
  Session,
  Slot,
} from "./types";
import { isShellClass } from "./types";
import { SEASON_END, SEASON_START, SEASON_YEAR, datesBetween, metricsCutoff } from "./dates";
import { deriveStatusAsOf, isAvailableStatus } from "./status";

// ---------- rounding and formatting (8.6) ----------

/** Round half up at `decimals` places, on a decimal representation (not toFixed). */
export function roundHalfUp(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  const shifted = Number(`${value}e${decimals}`);
  const rounded = Math.round(shifted); // Math.round rounds .5 toward +Infinity
  return Number(`${rounded}e-${decimals}`);
}

/** Percentage string with one decimal, or "n/a" when the denominator is 0. */
export function formatPct(numerator: number, denominator: number): string {
  if (denominator === 0) return "n/a";
  return `${roundHalfUp((100 * numerator) / denominator, 1).toFixed(1)}%`;
}

export function formatPctValue(pct: number | null): string {
  if (pct === null) return "n/a";
  return `${roundHalfUp(pct, 1).toFixed(1)}%`;
}

/** Dollars with two decimals and thousands separators. */
export function formatDollars(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}$${dollars.toLocaleString("en-US")}.${String(rem).padStart(2, "0")}`;
}

// ---------- 8.1 definitions ----------

export function assetAge(asset: Pick<Asset, "year_built">): number {
  return SEASON_YEAR - asset.year_built;
}

/** Dates from season start through min(today, season end) inclusive (A4). */
export function seasonDatesThrough(today: IsoDate): IsoDate[] {
  return datesBetween(SEASON_START, metricsCutoff(today));
}

export function availableAssetDays(asset: Asset, events: readonly DamageEvent[], today: IsoDate): number {
  let n = 0;
  for (const d of seasonDatesThrough(today)) {
    if (isAvailableStatus(deriveStatusAsOf(asset, events, d))) n++;
  }
  return n;
}

export function daysOffWater(asset: Asset, events: readonly DamageEvent[], today: IsoDate): number {
  let n = 0;
  for (const d of seasonDatesThrough(today)) {
    if (deriveStatusAsOf(asset, events, d) === "off_water") n++;
  }
  return n;
}

export function availableSessions(asset: Asset, events: readonly DamageEvent[], today: IsoDate): number {
  return availableAssetDays(asset, events, today) * 3;
}

/** Session-outs: approved allocations for the asset. */
export function sessionOuts(assetId: string, allocations: readonly Allocation[]): number {
  return allocations.filter((a) => a.approved && a.asset_id === assetId).length;
}

/** Utilization as a percentage number (not rounded), or null when n/a. */
export function utilization(
  asset: Asset,
  allocations: readonly Allocation[],
  events: readonly DamageEvent[],
  today: IsoDate,
): number | null {
  const denom = availableSessions(asset, events, today);
  if (denom === 0) return null;
  return (100 * sessionOuts(asset.id, allocations)) / denom;
}

/** Median of the non-null values; null if there are none. Even count: mean of middle two. */
export function median(values: readonly (number | null)[]): number | null {
  const xs = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 === 1 ? xs[mid]! : (xs[mid - 1]! + xs[mid]!) / 2;
}

/** Fleet median utilization across non-retired shells (oar sets excluded). */
export function fleetMedianUtilization(
  assets: readonly Asset[],
  allocations: readonly Allocation[],
  events: readonly DamageEvent[],
  today: IsoDate,
): number | null {
  const shells = assets.filter((a) => isShellClass(a.asset_class) && a.status !== "retired");
  return median(shells.map((a) => utilization(a, allocations, events, today)));
}

/** Sum of cost_cents over fixed events resolved inside the season. */
export function repairSpendCents(assetId: string, events: readonly DamageEvent[]): number {
  return events
    .filter(
      (e) =>
        e.asset_id === assetId &&
        e.status === "fixed" &&
        e.resolved_on !== null &&
        e.resolved_on >= SEASON_START &&
        e.resolved_on <= SEASON_END,
    )
    .reduce((n, e) => n + e.cost_cents, 0);
}

/** Repair ratio as a percentage number (not rounded). */
export function repairRatio(asset: Asset, events: readonly DamageEvent[]): number {
  if (asset.replacement_cost_cents === 0) return 0;
  return (100 * repairSpendCents(asset.id, events)) / asset.replacement_cost_cents;
}

/** 8.4: age >= 10 and repair ratio (as displayed, one decimal) >= 15.0. */
export function isReplacementCandidate(asset: Asset, events: readonly DamageEvent[]): boolean {
  return assetAge(asset) >= 10 && roundHalfUp(repairRatio(asset, events), 1) >= 15.0;
}

// ---------- 8.2 utilization by organization ----------

export interface OrgUtilizationRow {
  org: Organization;
  borrowed: number;
  owned: number;
  total: number;
  /** Percentage number or null when the house total is 0. */
  share: number | null;
  annual_fee_cents: number;
  /** Cents per session-out or null when total is 0. */
  fee_per_session_out_cents: number | null;
}

function approvedWithSession(allocations: readonly Allocation[], sessions: readonly Session[]) {
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  return allocations
    .filter((a) => a.approved)
    .map((a) => ({ allocation: a, session: sessionById.get(a.session_id) }))
    .filter((x): x is { allocation: Allocation; session: Session } => x.session !== undefined);
}

export function utilizationByOrg(
  organizations: readonly Organization[],
  allocations: readonly Allocation[],
  sessions: readonly Session[],
  assets: readonly Asset[],
): OrgUtilizationRow[] {
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const rows = approvedWithSession(allocations, sessions);
  const houseTotal = rows.length;
  return organizations.map((org) => {
    let borrowed = 0;
    let owned = 0;
    for (const { allocation, session } of rows) {
      if (session.org_id !== org.id) continue;
      const asset = assetById.get(allocation.asset_id);
      if (asset && asset.owner_org_id === org.id) owned++;
      else borrowed++;
    }
    const total = borrowed + owned;
    return {
      org,
      borrowed,
      owned,
      total,
      share: houseTotal === 0 ? null : (100 * total) / houseTotal,
      annual_fee_cents: org.annual_fee_cents,
      fee_per_session_out_cents: total === 0 ? null : roundHalfUp(org.annual_fee_cents / total, 0),
    };
  });
}

/** A6: session-outs by (org, program). */
export interface ProgramSplitRow {
  org: Organization;
  program: ProgramType | null;
  session_outs: number;
}

export const PROGRAM_ORDER: readonly (ProgramType | null)[] = ["mens", "womens", "mixed", null];

export function programSplit(
  organizations: readonly Organization[],
  allocations: readonly Allocation[],
  sessions: readonly Session[],
): ProgramSplitRow[] {
  const rows = approvedWithSession(allocations, sessions);
  const out: ProgramSplitRow[] = [];
  for (const org of organizations) {
    for (const program of PROGRAM_ORDER) {
      const n = rows.filter((r) => r.session.org_id === org.id && r.session.program === program).length;
      if (n > 0 || program !== null) out.push({ org, program, session_outs: n });
    }
  }
  return out;
}

/** Session-outs by program for one asset (boat report, A6). */
export function sessionOutsByProgram(
  assetId: string,
  allocations: readonly Allocation[],
  sessions: readonly Session[],
): Record<string, number> {
  const rows = approvedWithSession(allocations, sessions).filter((r) => r.allocation.asset_id === assetId);
  const out: Record<string, number> = { mens: 0, womens: 0, mixed: 0 };
  for (const r of rows) {
    const k = r.session.program ?? "unset";
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function sessionOutsByOrg(
  assetId: string,
  organizations: readonly Organization[],
  allocations: readonly Allocation[],
  sessions: readonly Session[],
): { org: Organization; session_outs: number }[] {
  const rows = approvedWithSession(allocations, sessions).filter((r) => r.allocation.asset_id === assetId);
  return organizations.map((org) => ({
    org,
    session_outs: rows.filter((r) => r.session.org_id === org.id).length,
  }));
}

export function sessionOutsBySlot(
  assetId: string,
  allocations: readonly Allocation[],
  sessions: readonly Session[],
): Record<Slot, number> {
  const rows = approvedWithSession(allocations, sessions).filter((r) => r.allocation.asset_id === assetId);
  const out: Record<Slot, number> = { AM1: 0, AM2: 0, PM1: 0 };
  for (const r of rows) out[r.session.slot] += 1;
  return out;
}

// ---------- 8.5 cost-share ----------

export interface CostShareRow {
  org: Organization;
  liable_damage_cents: number;
  fee_per_session_out_cents: number | null;
}

export function costShare(
  organizations: readonly Organization[],
  events: readonly DamageEvent[],
  utilRows: readonly OrgUtilizationRow[],
): CostShareRow[] {
  return organizations.map((org) => ({
    org,
    liable_damage_cents: events
      .filter((e) => e.liable_org_id === org.id)
      .reduce((n, e) => n + e.cost_cents, 0),
    fee_per_session_out_cents:
      utilRows.find((r) => r.org.id === org.id)?.fee_per_session_out_cents ?? null,
  }));
}
