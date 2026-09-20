// Builds the Week screen model (Section 11.2): sessions per (day, slot) with their
// allocations, warnings (caution, no oars), lock state, and override candidates.

import type { Allocation, Asset, Organization, Session, Slot } from "@/engine/types";
import { SLOTS, isOarSetClass, isShellClass } from "@/engine/types";
import { weekDates } from "@/engine/dates";
import { deriveStatusAsOf } from "@/engine/status";
import { isOarSetEligible, isShellEligible, oarClassFor } from "@/engine/eligibility";
import { type Db } from "./supabase";
import {
  loadAllocationsForSessions,
  loadAssets,
  loadDamageEvents,
  loadEntitlements,
  loadOrganizations,
  loadSessionsInWeek,
} from "./data";

export interface AllocationView {
  allocation: Allocation;
  asset: Asset;
  caution: boolean;
  candidates: { id: string; name: string }[];
}

export interface SessionView {
  session: Session;
  org: Organization;
  allocations: AllocationView[];
  seatsAllocated: number;
  noOars: number;
}

export interface WeekView {
  monday: string;
  dates: string[];
  slots: readonly Slot[];
  locked: boolean;
  allocationCount: number;
  cells: Record<string, SessionView[]>;
}

export const cellKey = (date: string, slot: Slot) => `${date}|${slot}`;

export async function loadWeekView(db: Db, monday: string): Promise<WeekView> {
  const [sessions, organizations, assets, entitlements, damageEvents] = await Promise.all([
    loadSessionsInWeek(db, monday),
    loadOrganizations(db),
    loadAssets(db),
    loadEntitlements(db),
    loadDamageEvents(db),
  ]);
  const allocations = await loadAllocationsForSessions(
    db,
    sessions.map((s) => s.id),
  );
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const orgById = new Map(organizations.map((o) => [o.id, o]));
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  // Assets taken per (date, slot), for candidate lists (5.5).
  const takenByCell = new Map<string, Set<string>>();
  for (const a of allocations) {
    const s = sessionById.get(a.session_id);
    if (!s) continue;
    const k = cellKey(s.date, s.slot);
    takenByCell.set(k, (takenByCell.get(k) ?? new Set()).add(a.asset_id));
  }

  const cells: Record<string, SessionView[]> = {};
  for (const s of sessions) {
    if (s.status === "cancelled") continue;
    const org = orgById.get(s.org_id);
    if (!org) continue;
    const statusOn = (assetId: string) => {
      const a = assetById.get(assetId);
      return a ? deriveStatusAsOf(a, damageEvents, s.date) : ("off_water" as const);
    };
    const rows = allocations.filter((a) => a.session_id === s.id);
    const views: AllocationView[] = [];
    for (const row of rows) {
      const asset = assetById.get(row.asset_id);
      if (!asset) continue;
      const taken = new Set(takenByCell.get(cellKey(s.date, s.slot)) ?? []);
      taken.delete(asset.id);
      const ctx = { statusOn, entitlements, taken };
      const candidates = assets
        .filter((c) =>
          c.id !== asset.id &&
          (isShellClass(asset.asset_class)
            ? isShellEligible(c, s, ctx)
            : isOarSetEligible(c, s, asset.asset_class as "oar_set_sweep" | "oar_set_scull", ctx)),
        )
        .map((c) => ({ id: c.id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      views.push({ allocation: row, asset, caution: statusOn(asset.id) === "caution", candidates });
    }
    const shells = views.map((v) => v.asset).filter((a) => isShellClass(a.asset_class));
    const oars = views.map((v) => v.asset).filter((a) => isOarSetClass(a.asset_class));
    const need = { oar_set_sweep: 0, oar_set_scull: 0 };
    for (const sh of shells) need[oarClassFor(sh.asset_class)] += 1;
    for (const o of oars) if (o.asset_class in need) need[o.asset_class as keyof typeof need] -= 1;
    const noOars = Math.max(0, need.oar_set_sweep) + Math.max(0, need.oar_set_scull);
    const view: SessionView = {
      session: s,
      org,
      allocations: views.sort((a, b) => Number(isOarSetClass(a.asset.asset_class)) - Number(isOarSetClass(b.asset.asset_class)) || b.asset.seats - a.asset.seats || a.asset.name.localeCompare(b.asset.name)),
      seatsAllocated: shells.reduce((n, a) => n + a.seats, 0),
      noOars,
    };
    const k = cellKey(s.date, s.slot);
    (cells[k] ??= []).push(view);
  }
  for (const k of Object.keys(cells)) cells[k]!.sort((a, b) => a.org.priority_tier - b.org.priority_tier);

  return {
    monday,
    dates: weekDates(monday),
    slots: SLOTS,
    locked: allocations.length > 0 && allocations.every((a) => a.approved),
    allocationCount: allocations.length,
    cells,
  };
}
