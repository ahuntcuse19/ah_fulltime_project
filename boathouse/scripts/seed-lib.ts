// Seed and checksum logic shared by `npm run seed` and acceptance test 1.

import { createHash } from "node:crypto";
import { deriveStoredStatus } from "@/engine/status";
import { weekMondays } from "@/engine/dates";
import { must, type Db } from "@/lib/supabase";
import { approveWeek, generateWeek } from "@/lib/generate";
import {
  LAST_APPROVED_MONDAY,
  assertStandingUnique,
  assets,
  damageEvents,
  entitlements,
  organizations,
  parts,
  sessions,
} from "./seed-data";

export const TABLES_IN_ORDER = [
  "organization",
  "asset",
  "entitlement",
  "session",
  "allocation",
  "damage_event",
  "part",
  "damage_event_part",
  "boat_report_note",
] as const;

const NATURAL_KEY: Record<(typeof TABLES_IN_ORDER)[number], string[]> = {
  organization: ["name"],
  asset: ["name"],
  entitlement: ["org_id", "asset_id", "kind", "slot"],
  session: ["org_id", "date", "slot"],
  allocation: ["session_id", "asset_id"],
  damage_event: ["asset_id", "reported_on", "component", "id"],
  part: ["name"],
  damage_event_part: ["damage_event_id", "part_id"],
  boat_report_note: ["asset_id"],
};

async function insertAll(db: Db, table: string, rows: object[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 500) {
    must(await db.from(table).insert(rows.slice(i, i + 500)).select("*"), `insert ${table}`);
  }
}

export async function fetchAll(db: Db, table: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const rows = must(await db.from(table).select("*").range(from, from + page - 1), `select ${table}`);
    out.push(...(rows as Record<string, unknown>[]));
    if (rows.length < page) break;
  }
  return out;
}

function canonical(row: Record<string, unknown>): string {
  return JSON.stringify(row, Object.keys(row).sort());
}

export interface TableChecksum {
  table: string;
  rows: number;
  sha256: string;
}

/** Per-table row count and sha256 of the rows sorted by natural key. */
export async function checksums(db: Db): Promise<TableChecksum[]> {
  const out: TableChecksum[] = [];
  for (const table of TABLES_IN_ORDER) {
    const rows = await fetchAll(db, table);
    const keys = NATURAL_KEY[table];
    rows.sort((a, b) => {
      for (const k of keys) {
        const x = String(a[k] ?? "");
        const y = String(b[k] ?? "");
        if (x !== y) return x < y ? -1 : 1;
      }
      return 0;
    });
    const h = createHash("sha256");
    for (const r of rows) h.update(canonical(r) + "\n");
    out.push({ table, rows: rows.length, sha256: h.digest("hex") });
  }
  return out;
}

/** Truncate everything and reload Section 10, then generate and approve per 10.7. */
export async function seed(db: Db, log: (msg: string) => void = () => {}): Promise<void> {
  assertStandingUnique(entitlements);

  log("Truncating all tables in dependency order");
  const trunc = await db.rpc("truncate_all");
  if (trunc.error) throw new Error(`truncate_all: ${trunc.error.message}`);

  log(`Loading ${organizations.length} organizations, ${assets.length} assets, ${entitlements.length} entitlements`);
  await insertAll(db, "organization", organizations);
  const assetsWithStatus = assets.map((a) => ({ ...a, status: deriveStoredStatus(a, damageEvents) }));
  await insertAll(db, "asset", assetsWithStatus);
  await insertAll(db, "entitlement", entitlements);

  log(`Loading ${sessions.length} sessions, ${damageEvents.length} damage events, ${parts.length} parts`);
  await insertAll(db, "session", sessions);
  await insertAll(db, "damage_event", damageEvents);
  await insertAll(db, "part", parts);

  log("Generating every week of the season");
  let inserted = 0;
  for (const monday of weekMondays()) {
    const summary = await generateWeek(db, monday);
    inserted += summary.inserted;
    if (monday <= LAST_APPROVED_MONDAY) await approveWeek(db, monday);
  }
  log(`Inserted ${inserted} allocations; approved weeks through ${LAST_APPROVED_MONDAY}`);
}
