// Runs the Section 10 seed through the engine in memory, week by week, exactly as
// scripts/seed.ts does against the database. Shared by the seed-sql renderer and tests.

import { allocateWeek } from "@/engine/allocate";
import { addDays, weekMondays } from "@/engine/dates";
import type { AllocationBasis, SessionStatus } from "@/engine/types";
import { LAST_APPROVED_MONDAY, assets, damageEvents, entitlements, organizations, sessions } from "./seed-data";

export interface SimulatedAllocation {
  session_id: string;
  asset_id: string;
  basis: AllocationBasis;
  approved: boolean;
}

export interface SeedSimulation {
  allocations: SimulatedAllocation[];
  statuses: Record<string, SessionStatus>;
  warnings: Record<string, { caution: string[]; noOars: number }>;
}

export function simulateSeed(): SeedSimulation {
  const allocations: SimulatedAllocation[] = [];
  const statuses: Record<string, SessionStatus> = {};
  const warnings: SeedSimulation["warnings"] = {};
  for (const monday of weekMondays()) {
    const sunday = addDays(monday, 6);
    const week = sessions.filter((s) => s.date >= monday && s.date <= sunday);
    const r = allocateWeek({ sessions: week, organizations, assets, entitlements, damageEvents });
    const approved = monday <= LAST_APPROVED_MONDAY;
    for (const a of r.allocations) {
      allocations.push({ session_id: a.session_id, asset_id: a.asset_id, basis: a.basis, approved });
    }
    Object.assign(statuses, r.sessionStatuses);
    Object.assign(warnings, r.warnings);
  }
  return { allocations, statuses, warnings };
}
