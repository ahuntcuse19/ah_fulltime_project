// Section 6 persisted: generate a week, approve a week, override an allocation.
// Used by the route handlers and by the seed (Section 10.7).

import { allocateWeek } from "@/engine/allocate";
import { isOarSetClass, isShellClass, type Allocation, type Asset, type Session, type SessionStatus } from "@/engine/types";
import { isShellEligible, isOarSetEligible } from "@/engine/eligibility";
import { deriveStatusAsOf } from "@/engine/status";
import { ids } from "./ids";
import { type Db, must } from "./supabase";
import {
  loadAllocationsForSessions,
  loadAssets,
  loadDamageEvents,
  loadEntitlements,
  loadOrganizations,
  loadSessionsInWeek,
} from "./data";

export interface GenerateSummary {
  monday: string;
  sessions: number;
  kept: number;
  deleted: number;
  inserted: number;
  statuses: Record<SessionStatus, number>;
}

/**
 * Re-runnable week generation (6.2, 6.5, 6.4, 6.6 and PLAN.md resolution 1):
 * approved and manual rows are kept and honoured as pre-allocations; every
 * other allocation for the week is deleted and recomputed.
 */
export async function generateWeek(db: Db, monday: string): Promise<GenerateSummary> {
  const [sessions, organizations, assets, entitlements, damageEvents] = await Promise.all([
    loadSessionsInWeek(db, monday),
    loadOrganizations(db),
    loadAssets(db),
    loadEntitlements(db),
    loadDamageEvents(db),
  ]);
  const active = sessions.filter((s) => s.status !== "cancelled");
  const existing = await loadAllocationsForSessions(db, active.map((s) => s.id));
  const kept = existing.filter((a) => a.approved || a.basis === "manual");
  const toDelete = existing.filter((a) => !(a.approved || a.basis === "manual"));

  const result = allocateWeek({
    sessions: active,
    organizations,
    assets,
    entitlements,
    damageEvents,
    kept,
  });

  if (toDelete.length > 0) {
    for (let i = 0; i < toDelete.length; i += 200) {
      const chunk = toDelete.slice(i, i + 200).map((a) => a.id);
      must(await db.from("allocation").delete().in("id", chunk).select("id"), "delete allocations");
    }
  }

  const rows: Allocation[] = result.allocations.map((a) => ({
    id: ids.allocation(a.session_id, a.asset_id),
    session_id: a.session_id,
    asset_id: a.asset_id,
    basis: a.basis,
    approved: false,
    overridden_from_asset_id: null,
    override_reason: null,
  }));
  for (let i = 0; i < rows.length; i += 500) {
    must(await db.from("allocation").insert(rows.slice(i, i + 500)).select("id"), "insert allocations");
  }

  const statuses: Record<SessionStatus, number> = {
    requested: 0,
    allocated: 0,
    partially_allocated: 0,
    unfilled: 0,
    cancelled: 0,
  };
  // Update statuses, grouping sessions by resulting status to keep the round trips small.
  const byStatus = new Map<SessionStatus, string[]>();
  for (const s of active) {
    const st = result.sessionStatuses[s.id] ?? "unfilled";
    statuses[st] += 1;
    if (s.status !== st) byStatus.set(st, [...(byStatus.get(st) ?? []), s.id]);
  }
  for (const [st, sids] of byStatus) {
    must(await db.from("session").update({ status: st }).in("id", sids).select("id"), "update session status");
  }

  return {
    monday,
    sessions: active.length,
    kept: kept.length,
    deleted: toDelete.length,
    inserted: rows.length,
    statuses,
  };
}

/** 6.6: approve every allocation in the week. Nothing else changes. */
export async function approveWeek(db: Db, monday: string): Promise<number> {
  const sessions = await loadSessionsInWeek(db, monday);
  if (sessions.length === 0) return 0;
  const rows = must(
    await db
      .from("allocation")
      .update({ approved: true })
      .in(
        "session_id",
        sessions.map((s) => s.id),
      )
      .select("id"),
    "approve allocations",
  );
  return rows.length;
}

export class OverrideError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

/**
 * 6.4: replace one allocated asset with another eligible asset for the same session.
 * Sets basis = manual, overridden_from_asset_id, and requires a non-empty reason.
 */
export async function overrideAllocation(
  db: Db,
  allocationId: string,
  newAssetId: string,
  reason: string,
): Promise<Allocation> {
  if (typeof reason !== "string" || reason.trim().length === 0) {
    throw new OverrideError("Override reason is required", 400);
  }
  const current = must(await db.from("allocation").select("*").eq("id", allocationId), "allocation")[0] as
    | Allocation
    | undefined;
  if (!current) throw new OverrideError("Allocation not found", 404);
  if (current.asset_id === newAssetId) throw new OverrideError("Choose a different asset", 400);

  const session = must(await db.from("session").select("*").eq("id", current.session_id), "session")[0] as
    | Session
    | undefined;
  if (!session) throw new OverrideError("Session not found", 404);

  const [assets, entitlements, damageEvents] = await Promise.all([
    loadAssets(db),
    loadEntitlements(db),
    loadDamageEvents(db),
  ]);
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const oldAsset = assetById.get(current.asset_id);
  const newAsset = assetById.get(newAssetId);
  if (!oldAsset || !newAsset) throw new OverrideError("Asset not found", 404);

  // 5.5: exclude assets already allocated at this (date, slot), across every session.
  const sameSlot = must(
    await db.from("session").select("id").eq("date", session.date).eq("slot", session.slot),
    "sessions at slot",
  ) as { id: string }[];
  const slotAllocations = await loadAllocationsForSessions(
    db,
    sameSlot.map((s) => s.id),
  );
  const taken = new Set(slotAllocations.filter((a) => a.id !== allocationId).map((a) => a.asset_id));
  const ctx = {
    statusOn: (assetId: string) => {
      const a = assetById.get(assetId);
      return a ? deriveStatusAsOf(a, damageEvents, session.date) : ("off_water" as const);
    },
    entitlements,
    taken,
  };

  let eligible: boolean;
  if (isShellClass(oldAsset.asset_class)) {
    eligible = isShellEligible(newAsset as Asset, session, ctx);
  } else if (isOarSetClass(oldAsset.asset_class)) {
    const cls = oldAsset.asset_class as "oar_set_sweep" | "oar_set_scull";
    eligible = isOarSetEligible(newAsset as Asset, session, cls, ctx);
  } else {
    eligible = false;
  }
  if (!eligible) throw new OverrideError("Replacement asset is not eligible for this session", 409);

  const updated = must(
    await db
      .from("allocation")
      .update({
        asset_id: newAssetId,
        basis: "manual",
        overridden_from_asset_id: current.asset_id,
        override_reason: reason.trim(),
      })
      .eq("id", allocationId)
      .select("*"),
    "override allocation",
  )[0] as Allocation;
  return updated;
}
