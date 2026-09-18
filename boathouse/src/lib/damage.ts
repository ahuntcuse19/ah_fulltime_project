// Section 4.6 and 4.8: damage events, status re-derivation on every write,
// parts decrement when an event moves to fixed. Section 11.1: retire toggle (A9).

import type { Asset, Component, DamageEvent, DamageStatus, Severity } from "@/engine/types";
import { deriveStoredStatus } from "@/engine/status";
import { todayNY } from "@/engine/dates";
import { ids } from "./ids";
import { type Db, must } from "./supabase";

export class DamageError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

const COMPONENTS: Component[] = ["hull", "rigger", "oarlock", "seat_slide", "foot_stretcher", "fin_skeg", "oar", "other"];
const SEVERITIES: Severity[] = ["cosmetic", "caution", "off_water"];
const STATUSES: DamageStatus[] = ["open", "parts_ordered", "fixed"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export interface DamageEventInput {
  asset_id: string;
  reported_on: string;
  reported_by_org_id: string | null;
  liable_org_id: string | null;
  component: Component;
  description: string;
  severity: Severity;
  status: DamageStatus;
  resolved_on: string | null;
  cost_cents: number;
  parts?: { part_id: string; qty_used: number }[];
}

function validate(input: Partial<DamageEventInput>, partial: boolean): void {
  const req = (cond: boolean, msg: string) => {
    if (!cond) throw new DamageError(msg, 400);
  };
  if (!partial || input.component !== undefined) req(COMPONENTS.includes(input.component as Component), "component is invalid");
  if (!partial || input.severity !== undefined) req(SEVERITIES.includes(input.severity as Severity), "severity is invalid");
  if (!partial || input.status !== undefined) req(STATUSES.includes(input.status as DamageStatus), "status is invalid");
  if (!partial || input.reported_on !== undefined) req(typeof input.reported_on === "string" && ISO.test(input.reported_on), "reported_on must be YYYY-MM-DD");
  if (input.resolved_on !== undefined && input.resolved_on !== null) req(ISO.test(input.resolved_on), "resolved_on must be YYYY-MM-DD");
  if (input.cost_cents !== undefined) req(Number.isInteger(input.cost_cents) && input.cost_cents >= 0, "cost_cents must be a non-negative integer");
  if (!partial) req(typeof input.description === "string", "description is required");
  if (input.parts !== undefined) {
    req(Array.isArray(input.parts), "parts must be a list");
    for (const p of input.parts!) req(typeof p.part_id === "string" && Number.isInteger(p.qty_used) && p.qty_used > 0, "each part needs part_id and a positive qty_used");
  }
}

/** 4.6: recompute and store asset.status from open or parts_ordered events. */
export async function recomputeAssetStatus(db: Db, assetId: string): Promise<Asset> {
  const asset = must(await db.from("asset").select("*").eq("id", assetId), "asset")[0] as Asset | undefined;
  if (!asset) throw new DamageError("Asset not found", 404);
  const events = must(await db.from("damage_event").select("*").eq("asset_id", assetId), "damage_event") as DamageEvent[];
  const status = deriveStoredStatus(asset, events);
  if (status !== asset.status) {
    must(await db.from("asset").update({ status }).eq("id", assetId).select("id"), "update asset status");
  }
  return { ...asset, status };
}

async function replaceParts(db: Db, eventId: string, parts: { part_id: string; qty_used: number }[]): Promise<void> {
  must(await db.from("damage_event_part").delete().eq("damage_event_id", eventId).select("part_id"), "clear parts");
  if (parts.length > 0) {
    must(
      await db
        .from("damage_event_part")
        .insert(parts.map((p) => ({ damage_event_id: eventId, part_id: p.part_id, qty_used: p.qty_used })))
        .select("part_id"),
      "link parts",
    );
  }
}

/** 4.8: decrement qty_in_stock by qty_used for each linked part. */
async function decrementParts(db: Db, eventId: string): Promise<void> {
  const links = must(await db.from("damage_event_part").select("*").eq("damage_event_id", eventId), "damage_event_part") as {
    part_id: string;
    qty_used: number;
  }[];
  for (const link of links) {
    const part = must(await db.from("part").select("*").eq("id", link.part_id), "part")[0] as { qty_in_stock: number } | undefined;
    if (!part) continue;
    must(
      await db.from("part").update({ qty_in_stock: part.qty_in_stock - link.qty_used }).eq("id", link.part_id).select("id"),
      "decrement part",
    );
  }
}

export async function createDamageEvent(db: Db, input: DamageEventInput): Promise<DamageEvent> {
  validate(input, false);
  if (input.status === "fixed" && !input.resolved_on) throw new DamageError("resolved_on is required when status is fixed", 400);
  const id = ids.random();
  const row: DamageEvent = {
    id,
    asset_id: input.asset_id,
    reported_on: input.reported_on,
    reported_by_org_id: input.reported_by_org_id ?? null,
    liable_org_id: input.liable_org_id ?? null,
    component: input.component,
    description: input.description,
    severity: input.severity,
    status: input.status,
    resolved_on: input.resolved_on ?? null,
    cost_cents: input.cost_cents ?? 0,
  };
  const inserted = must(await db.from("damage_event").insert(row).select("*"), "insert damage_event")[0] as DamageEvent;
  if (input.parts) await replaceParts(db, id, input.parts);
  if (row.status === "fixed") await decrementParts(db, id);
  await recomputeAssetStatus(db, row.asset_id);
  return inserted;
}

export async function updateDamageEvent(db: Db, id: string, patch: Partial<DamageEventInput>): Promise<DamageEvent> {
  validate(patch, true);
  const current = must(await db.from("damage_event").select("*").eq("id", id), "damage_event")[0] as DamageEvent | undefined;
  if (!current) throw new DamageError("Damage event not found", 404);
  const { parts, ...fields } = patch;
  const next = { ...current, ...fields } as DamageEvent;
  if (next.status === "fixed" && !next.resolved_on) throw new DamageError("resolved_on is required when status is fixed", 400);
  if (Object.keys(fields).length > 0) {
    must(await db.from("damage_event").update(fields).eq("id", id).select("id"), "update damage_event");
  }
  if (parts) await replaceParts(db, id, parts);
  if (current.status !== "fixed" && next.status === "fixed") await decrementParts(db, id);
  await recomputeAssetStatus(db, current.asset_id);
  return must(await db.from("damage_event").select("*").eq("id", id), "damage_event")[0] as DamageEvent;
}

/** Section 11.1 retire toggle with A9 retired_on. */
export async function toggleRetired(db: Db, assetId: string): Promise<Asset> {
  const asset = must(await db.from("asset").select("*").eq("id", assetId), "asset")[0] as Asset | undefined;
  if (!asset) throw new DamageError("Asset not found", 404);
  if (asset.status === "retired") {
    must(await db.from("asset").update({ status: "on_water", retired_on: null }).eq("id", assetId).select("id"), "unretire");
    return recomputeAssetStatus(db, assetId);
  }
  const retired_on = todayNY();
  must(await db.from("asset").update({ status: "retired", retired_on }).eq("id", assetId).select("id"), "retire");
  return { ...asset, status: "retired", retired_on };
}
