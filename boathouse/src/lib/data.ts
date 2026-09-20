// Read helpers shared by route handlers, server components, and the seed.

import type {
  Allocation,
  Asset,
  BoatReportNote,
  DamageEvent,
  Entitlement,
  Organization,
  Part,
  Session,
} from "@/engine/types";
import { addDays } from "@/engine/dates";
import { type Db, must } from "./supabase";

export async function loadOrganizations(db: Db): Promise<Organization[]> {
  return must(await db.from("organization").select("*").order("priority_tier").order("name"), "organization");
}

export async function loadAssets(db: Db): Promise<Asset[]> {
  return must(await db.from("asset").select("*").order("name"), "asset");
}

export async function loadEntitlements(db: Db): Promise<Entitlement[]> {
  return must(await db.from("entitlement").select("*"), "entitlement");
}

export async function loadDamageEvents(db: Db): Promise<DamageEvent[]> {
  return must(await db.from("damage_event").select("*").order("reported_on").order("id"), "damage_event");
}

export async function loadParts(db: Db): Promise<Part[]> {
  return must(await db.from("part").select("*").order("name"), "part");
}

export async function loadSessionsInWeek(db: Db, monday: string): Promise<Session[]> {
  const sunday = addDays(monday, 6);
  return must(
    await db.from("session").select("*").gte("date", monday).lte("date", sunday).order("date").order("slot").order("created_at"),
    "session",
  );
}

export async function loadAllSessions(db: Db): Promise<Session[]> {
  // PostgREST caps a single select at 1000 rows by default; page through.
  const out: Session[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const rows = must(
      await db.from("session").select("*").order("date").order("slot").order("org_id").range(from, from + page - 1),
      "session",
    );
    out.push(...rows);
    if (rows.length < page) break;
  }
  return out;
}

export async function loadAllocationsForSessions(db: Db, sessionIds: string[]): Promise<Allocation[]> {
  if (sessionIds.length === 0) return [];
  const out: Allocation[] = [];
  for (let i = 0; i < sessionIds.length; i += 200) {
    const chunk = sessionIds.slice(i, i + 200);
    out.push(...must(await db.from("allocation").select("*").in("session_id", chunk), "allocation"));
  }
  return out;
}

export async function loadAllAllocations(db: Db): Promise<Allocation[]> {
  const out: Allocation[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const rows = must(await db.from("allocation").select("*").order("id").range(from, from + page - 1), "allocation");
    out.push(...rows);
    if (rows.length < page) break;
  }
  return out;
}

export async function loadNote(db: Db, assetId: string): Promise<BoatReportNote | null> {
  const rows = must(await db.from("boat_report_note").select("*").eq("asset_id", assetId), "boat_report_note");
  return rows[0] ?? null;
}
