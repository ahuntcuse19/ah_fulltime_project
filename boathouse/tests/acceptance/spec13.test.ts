// SPEC.md Section 13 acceptance tests, run against the seeded database.
// Test 2 runs on 2026-04-21 per PLAN.md decision B (2026-04-07 has the 2019 8+ off water).
// Test 8 lives in intake.test.ts (needs an Anthropic key or a deployed URL).

import { beforeAll, describe, expect, it } from "vitest";
import type { Allocation, Asset, DamageEvent, Organization, Session } from "@/engine/types";
import { isShellClass } from "@/engine/types";
import { todayNY } from "@/engine/dates";
import { assetAge, daysOffWater, isReplacementCandidate, repairRatio, roundHalfUp, utilizationByOrg } from "@/engine/metrics";
import { createServerClient, type Db } from "@/lib/supabase";
import {
  loadAllAllocations,
  loadAllSessions,
  loadAllocationsForSessions,
  loadAssets,
  loadDamageEvents,
  loadOrganizations,
  loadSessionsInWeek,
} from "@/lib/data";
import { OverrideError, generateWeek, overrideAllocation } from "@/lib/generate";
import { checksums, seed } from "../../scripts/seed-lib";

let db: Db;
let orgs: Organization[];
let assets: Asset[];
let events: DamageEvent[];
let sessions: Session[];
let allocations: Allocation[];

const byName = (name: string) => {
  const a = assets.find((x) => x.name === name);
  if (!a) throw new Error(`missing asset ${name}`);
  return a;
};
const orgByName = (name: string) => {
  const o = orgs.find((x) => x.name === name);
  if (!o) throw new Error(`missing org ${name}`);
  return o;
};
const sessionAt = (orgName: string, date: string, slot: Session["slot"]) =>
  sessions.find((s) => s.org_id === orgByName(orgName).id && s.date === date && s.slot === slot);
const shellsOf = (sessionId: string) =>
  allocations
    .filter((a) => a.session_id === sessionId)
    .map((a) => assets.find((x) => x.id === a.asset_id)!)
    .filter((a) => isShellClass(a.asset_class));

async function reload() {
  [orgs, assets, events, sessions, allocations] = await Promise.all([
    loadOrganizations(db),
    loadAssets(db),
    loadDamageEvents(db),
    loadAllSessions(db),
    loadAllAllocations(db),
  ]);
}

beforeAll(async () => {
  db = createServerClient();
  await reload();
});

describe("Section 13", () => {
  it("1. seed twice: row counts and checksums identical", async () => {
    await seed(db);
    const first = await checksums(db);
    await seed(db);
    const second = await checksums(db);
    expect(second).toEqual(first);
    expect(first.map((c) => c.rows)).toEqual([3, 25, 57, 665, 3101, 8, 6, 0, 0]);
    await reload();
  });

  it("2. on 2026-04-21 AM1 the college holds the standing 2016 house 8+ plus its two owned competitive 8+ = 24 seats, allocated; club has no AM1", () => {
    const s = sessionAt("Riverside University Crew", "2026-04-21", "AM1");
    expect(s).toBeDefined();
    const shells = shellsOf(s!.id);
    expect(new Set(shells.map((a) => a.name))).toEqual(new Set(["The Ashford", "The Meridian", "Riverside Blue"]));
    const ashford = allocations.find((a) => a.session_id === s!.id && a.asset_id === byName("The Ashford").id);
    expect(ashford?.basis).toBe("standing");
    expect(shells.reduce((n, a) => n + a.seats, 0)).toBe(24);
    expect(s!.status).toBe("allocated");
    expect(sessionAt("Harbor Rowing Club", "2026-04-21", "AM1")).toBeUndefined();
  });

  it("3. on 2026-04-08 PM1 the community program receives the 2007 8+ then the 2009 4+, allocated, and never a non-novice shell", () => {
    const s = sessionAt("Eastside Community Rowing", "2026-04-08", "PM1");
    expect(s).toBeDefined();
    const shells = shellsOf(s!.id).sort((a, b) => b.seats - a.seats);
    expect(shells.map((a) => a.name)).toEqual(["The Lockwood", "The Kestrel"]);
    expect(s!.status).toBe("allocated");
    const communityId = orgByName("Eastside Community Rowing").id;
    const communitySessionIds = new Set(sessions.filter((x) => x.org_id === communityId).map((x) => x.id));
    const tiers = new Set(
      allocations
        .filter((a) => communitySessionIds.has(a.session_id))
        .map((a) => assets.find((x) => x.id === a.asset_id)!)
        .filter((a) => isShellClass(a.asset_class))
        .map((a) => a.quality_tier),
    );
    expect([...tiers]).toEqual(["novice"]);
  });

  it("4. on 2026-07-15 PM1 the 2007 8+ is allocated to nobody and the community uses 4+, 2x, 1x novice shells only", () => {
    const daySessions = new Set(sessions.filter((x) => x.date === "2026-07-15").map((x) => x.id));
    const lockwood = byName("The Lockwood").id;
    expect(allocations.some((a) => a.asset_id === lockwood && daySessions.has(a.session_id))).toBe(false);
    const s = sessionAt("Eastside Community Rowing", "2026-07-15", "PM1");
    expect(s).toBeDefined();
    expect(["partially_allocated", "allocated"]).toContain(s!.status);
    const shells = shellsOf(s!.id);
    expect(shells.length).toBeGreaterThan(0);
    for (const a of shells) {
      expect(["shell_4+", "shell_2x", "shell_1x"]).toContain(a.asset_class);
      expect(a.quality_tier).toBe("novice");
    }
  });

  it("5. between 2026-04-02 and 2026-04-16 the college 2019 8+ has zero allocations and 15 days off water", () => {
    const blue = byName("Riverside Blue");
    const inRange = new Set(sessions.filter((x) => x.date >= "2026-04-02" && x.date <= "2026-04-16").map((x) => x.id));
    expect(allocations.filter((a) => a.asset_id === blue.id && inRange.has(a.session_id))).toHaveLength(0);
    expect(daysOffWater(blue, events, todayNY())).toBe(15);
  });

  it("6. fleet view flags exactly the shells with age >= 10 and repair ratio >= 15.0; the 2007 8+ is not flagged", () => {
    const shells = assets.filter((a) => isShellClass(a.asset_class) && a.status !== "retired");
    const flagged = shells.filter((a) => isReplacementCandidate(a, events)).map((a) => a.name);
    const expected = shells
      .filter((a) => assetAge(a) >= 10 && roundHalfUp(repairRatio(a, events), 1) >= 15.0)
      .map((a) => a.name);
    expect(flagged).toEqual(expected);
    expect(flagged).not.toContain("The Lockwood");
  });

  it("7. utilization by organization sums session-outs to the count of approved allocations on shells and oar sets", () => {
    const rows = utilizationByOrg(orgs, allocations, sessions, assets);
    const total = rows.reduce((n, r) => n + r.total, 0);
    expect(total).toBe(allocations.filter((a) => a.approved).length);
    expect(total).toBeGreaterThan(0);
  });

  it("9. an override without a reason is rejected and nothing changes", async () => {
    const week = await loadSessionsInWeek(db, "2026-09-14"); // unapproved week
    const rows = await loadAllocationsForSessions(
      db,
      week.map((s) => s.id),
    );
    const target = rows.find((a) => isShellClass(assets.find((x) => x.id === a.asset_id)!.asset_class));
    expect(target).toBeDefined();
    const other = assets.find((a) => isShellClass(a.asset_class) && a.id !== target!.asset_id)!;
    await expect(overrideAllocation(db, target!.id, other.id, "")).rejects.toMatchObject({ status: 400 });
    await expect(overrideAllocation(db, target!.id, other.id, "   ")).rejects.toBeInstanceOf(OverrideError);
    const after = await loadAllocationsForSessions(db, [target!.session_id]);
    expect(after.find((a) => a.id === target!.id)).toEqual(target);
    if (process.env.ACCEPTANCE_BASE_URL) {
      const res = await fetch(`${process.env.ACCEPTANCE_BASE_URL}/api/allocations/${target!.id}/override`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ asset_id: other.id, reason: "" }),
      });
      expect(res.status).toBe(400);
    }
  });

  it("10. re-generating an approved week changes nothing", async () => {
    const monday = "2026-04-20";
    const week = await loadSessionsInWeek(db, monday);
    const ids = week.map((s) => s.id);
    const before = (await loadAllocationsForSessions(db, ids)).sort((a, b) => a.id.localeCompare(b.id));
    expect(before.length).toBeGreaterThan(0);
    expect(before.every((a) => a.approved)).toBe(true);
    if (process.env.ACCEPTANCE_BASE_URL) {
      const res = await fetch(`${process.env.ACCEPTANCE_BASE_URL}/api/weeks/${monday}/generate`, { method: "POST" });
      expect(res.status).toBe(200);
    } else {
      const summary = await generateWeek(db, monday);
      expect(summary.inserted).toBe(0);
      expect(summary.deleted).toBe(0);
    }
    const after = (await loadAllocationsForSessions(db, ids)).sort((a, b) => a.id.localeCompare(b.id));
    expect(after).toEqual(before);
    const weekAfter = await loadSessionsInWeek(db, monday);
    expect(weekAfter.map((s) => [s.id, s.status])).toEqual(week.map((s) => [s.id, s.status]));
  });
});
