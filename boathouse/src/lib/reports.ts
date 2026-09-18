// Section 8 report models built from the engine's metrics over the database rows.

import type { Allocation, Asset, DamageEvent, Organization, Session } from "@/engine/types";
import { isShellClass } from "@/engine/types";
import { todayNY } from "@/engine/dates";
import {
  assetAge,
  availableSessions,
  costShare,
  daysOffWater,
  fleetMedianUtilization,
  isReplacementCandidate,
  programSplit,
  repairRatio,
  repairSpendCents,
  sessionOuts,
  sessionOutsByOrg,
  sessionOutsByProgram,
  sessionOutsBySlot,
  utilization,
  utilizationByOrg,
  type CostShareRow,
  type OrgUtilizationRow,
  type ProgramSplitRow,
} from "@/engine/metrics";
import { type Db } from "./supabase";
import { loadAllAllocations, loadAllSessions, loadAssets, loadDamageEvents, loadOrganizations } from "./data";

export interface ReportData {
  today: string;
  organizations: Organization[];
  assets: Asset[];
  events: DamageEvent[];
  sessions: Session[];
  allocations: Allocation[];
}

export async function loadReportData(db: Db): Promise<ReportData> {
  const [organizations, assets, events, sessions, allocations] = await Promise.all([
    loadOrganizations(db),
    loadAssets(db),
    loadDamageEvents(db),
    loadAllSessions(db),
    loadAllAllocations(db),
  ]);
  return { today: todayNY(), organizations, assets, events, sessions, allocations };
}

export interface FleetRow {
  asset: Asset;
  age: number;
  utilizationPct: number | null;
  repairRatioPct: number;
  candidate: boolean;
}

/** 8.4 fleet view rows: non-retired shells. */
export function fleetRows(d: ReportData): FleetRow[] {
  return d.assets
    .filter((a) => isShellClass(a.asset_class) && a.status !== "retired")
    .map((a) => ({
      asset: a,
      age: assetAge(a),
      utilizationPct: utilization(a, d.allocations, d.events, d.today),
      repairRatioPct: repairRatio(a, d.events),
      candidate: isReplacementCandidate(a, d.events),
    }));
}

export function orgUtilization(d: ReportData): OrgUtilizationRow[] {
  return utilizationByOrg(d.organizations, d.allocations, d.sessions, d.assets);
}

export function programRows(d: ReportData): ProgramSplitRow[] {
  return programSplit(d.organizations, d.allocations, d.sessions);
}

export function costShareRows(d: ReportData): CostShareRow[] {
  return costShare(d.organizations, d.events, orgUtilization(d));
}

export interface BoatReport {
  asset: Asset;
  age: number;
  sessionOuts: number;
  availableSessions: number;
  utilizationPct: number | null;
  fleetMedianPct: number | null;
  byOrg: { org: Organization; session_outs: number }[];
  bySlot: Record<"AM1" | "AM2" | "PM1", number>;
  byProgram: Record<string, number>;
  events: DamageEvent[];
  repairSpendCents: number;
  repairRatioPct: number;
  daysOffWater: number;
}

/** 8.3 boat report numbers for one asset (shell or oar set). */
export function boatReport(d: ReportData, asset: Asset): BoatReport {
  return {
    asset,
    age: assetAge(asset),
    sessionOuts: sessionOuts(asset.id, d.allocations),
    availableSessions: availableSessions(asset, d.events, d.today),
    utilizationPct: utilization(asset, d.allocations, d.events, d.today),
    fleetMedianPct: fleetMedianUtilization(d.assets, d.allocations, d.events, d.today),
    byOrg: sessionOutsByOrg(asset.id, d.organizations, d.allocations, d.sessions),
    bySlot: sessionOutsBySlot(asset.id, d.allocations, d.sessions),
    byProgram: sessionOutsByProgram(asset.id, d.allocations, d.sessions),
    events: d.events.filter((e) => e.asset_id === asset.id).sort((a, b) => a.reported_on.localeCompare(b.reported_on)),
    repairSpendCents: repairSpendCents(asset.id, d.events),
    repairRatioPct: repairRatio(asset, d.events),
    daysOffWater: daysOffWater(asset, d.events, d.today),
  };
}
