// Runs the Section 10 seed through the engine in memory (no database) and checks
// determinism plus the seed-level expectations behind acceptance tests 2 to 7.

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { allocateWeek, type AllocationDraft } from "./allocate";
import { weekMondays, addDays } from "./dates";
import { daysOffWater, isReplacementCandidate, utilizationByOrg } from "./metrics";
import { isShellClass, type Allocation, type Session } from "./types";
import {
  CLUB,
  COLLEGE,
  COMMUNITY,
  LAST_APPROVED_MONDAY,
  assetByName,
  assets,
  assertStandingUnique,
  damageEvents,
  entitlements,
  organizations,
  sessions,
} from "../../scripts/seed-data";

interface Sim {
  allocations: Allocation[];
  statuses: Record<string, string>;
  warnings: Record<string, { caution: string[]; noOars: number }>;
}

function simulate(): Sim {
  const allocations: Allocation[] = [];
  const statuses: Record<string, string> = {};
  const warnings: Sim["warnings"] = {};
  for (const monday of weekMondays()) {
    const sunday = addDays(monday, 6);
    const week = sessions.filter((s) => s.date >= monday && s.date <= sunday);
    const r = allocateWeek({ sessions: week, organizations, assets, entitlements, damageEvents });
    const approved = monday <= LAST_APPROVED_MONDAY;
    for (const a of r.allocations as AllocationDraft[]) {
      allocations.push({
        id: `${a.session_id}|${a.asset_id}`,
        session_id: a.session_id,
        asset_id: a.asset_id,
        basis: a.basis,
        approved,
        overridden_from_asset_id: null,
        override_reason: null,
      });
    }
    Object.assign(statuses, r.sessionStatuses);
    Object.assign(warnings, r.warnings);
  }
  return { allocations, statuses, warnings };
}

const sessionAt = (org: string, date: string, slot: Session["slot"]) =>
  sessions.find((s) => s.org_id === org && s.date === date && s.slot === slot);

const sim = simulate();
const shellNames = (sessionId: string) =>
  sim.allocations
    .filter((a) => a.session_id === sessionId)
    .map((a) => assets.find((x) => x.id === a.asset_id)!)
    .filter((a) => isShellClass(a.asset_class))
    .map((a) => a.name);

describe("seed shape", () => {
  it("has the Section 10 counts with decision A", () => {
    expect(organizations).toHaveLength(3);
    expect(assets.filter((a) => isShellClass(a.asset_class))).toHaveLength(19);
    expect(assets.filter((a) => a.asset_class === "shell_8+")).toHaveLength(7);
    expect(assets.filter((a) => !isShellClass(a.asset_class))).toHaveLength(6);
    expect(assets.filter((a) => isShellClass(a.asset_class) && a.donor_name)).toHaveLength(12);
    expect(sessions).toHaveLength(35 * 19);
    expect(damageEvents).toHaveLength(8);
    expect(() => assertStandingUnique(entitlements)).not.toThrow();
    expect(entitlements.filter((e) => e.kind === "standing")).toHaveLength(2);
    // A2: every org eligible on every oar set; A7: never standing.
    const oarIds = assets.filter((a) => !isShellClass(a.asset_class)).map((a) => a.id);
    for (const o of organizations) {
      for (const id of oarIds) {
        expect(entitlements.some((e) => e.org_id === o.id && e.asset_id === id && e.kind === "eligible")).toBe(true);
      }
    }
    expect(entitlements.some((e) => e.kind === "standing" && oarIds.includes(e.asset_id))).toBe(false);
  });

  it("purchase cost formula", () => {
    expect(assetByName("The Lockwood").purchase_cost_cents).toBe(2_795_000); // 65000 * (1 - 0.57)
    expect(assetByName("The Driftwood").purchase_cost_cents).toBe(720_000); // 18000 * 0.40
    expect(assetByName("The Falcon").purchase_cost_cents).toBe(1_092_000); // 12000 * 0.91
  });
});

describe("determinism", () => {
  it("two simulations produce identical allocations and statuses", () => {
    const a = simulate();
    const b = simulate();
    const hash = (s: Sim) =>
      createHash("sha256").update(JSON.stringify([s.allocations, s.statuses, s.warnings])).digest("hex");
    expect(hash(a)).toBe(hash(b));
    expect(a.allocations.length).toBeGreaterThan(0);
  });
});

describe("acceptance expectations at engine level", () => {
  it("test 2 on 2026-04-21: college holds The Ashford (standing) plus both owned competitive 8+, 24 seats, allocated", () => {
    const s = sessionAt(COLLEGE, "2026-04-21", "AM1")!;
    expect(shellNames(s.id)).toEqual(["The Ashford", "The Meridian", "Riverside Blue"]);
    expect(sim.allocations.find((a) => a.session_id === s.id && a.asset_id === assetByName("The Ashford").id)?.basis).toBe("standing");
    expect(sim.statuses[s.id]).toBe("allocated");
    expect(sessionAt(CLUB, "2026-04-21", "AM1")).toBeUndefined();
  });

  it("decision B: on 2026-04-07 the college borrows Club Fifteen while Riverside Blue is off water", () => {
    const s = sessionAt(COLLEGE, "2026-04-07", "AM1")!;
    expect(shellNames(s.id)).toEqual(["The Ashford", "The Meridian", "Club Fifteen"]);
    expect(sim.statuses[s.id]).toBe("allocated");
  });

  it("test 3: 2026-04-08 PM1 community gets The Lockwood then The Kestrel, allocated, novice shells only", () => {
    const s = sessionAt(COMMUNITY, "2026-04-08", "PM1")!;
    expect(shellNames(s.id)).toEqual(["The Lockwood", "The Kestrel"]);
    expect(sim.statuses[s.id]).toBe("allocated");
    const communityShells = new Set(
      sim.allocations
        .filter((a) => sessions.find((x) => x.id === a.session_id)!.org_id === COMMUNITY)
        .map((a) => assets.find((x) => x.id === a.asset_id)!)
        .filter((a) => isShellClass(a.asset_class))
        .map((a) => a.quality_tier),
    );
    expect([...communityShells]).toEqual(["novice"]);
  });

  it("test 4: 2026-07-15 PM1, The Lockwood is off water and the community uses 4+, 2x, 1x novice shells", () => {
    const s = sessionAt(COMMUNITY, "2026-07-15", "PM1")!;
    const lockwood = assetByName("The Lockwood").id;
    const daySessions = sessions.filter((x) => x.date === "2026-07-15").map((x) => x.id);
    expect(sim.allocations.some((a) => a.asset_id === lockwood && daySessions.includes(a.session_id))).toBe(false);
    expect(shellNames(s.id)).toEqual(["The Kestrel", "The Sandpiper", "The Driftwood", "The Minnow"]);
    expect(sim.statuses[s.id]).toBe("partially_allocated");
    expect(sim.warnings[s.id]?.noOars).toBe(1); // three scull shells, two scull sets
  });

  it("test 5: Riverside Blue has zero allocations 2026-04-02 to 2026-04-16 and 15 days off water", () => {
    const blue = assetByName("Riverside Blue");
    const inRange = sessions.filter((x) => x.date >= "2026-04-02" && x.date <= "2026-04-16").map((x) => x.id);
    expect(sim.allocations.filter((a) => a.asset_id === blue.id && inRange.includes(a.session_id))).toHaveLength(0);
    expect(daysOffWater(blue, damageEvents, "2026-09-15")).toBe(15);
  });

  it("test 6: no seeded shell is a replacement candidate", () => {
    const flagged = assets.filter((a) => isShellClass(a.asset_class) && isReplacementCandidate(a, damageEvents));
    expect(flagged).toEqual([]);
  });

  it("test 7: utilization by org sums to the approved allocation count (shells and oar sets)", () => {
    const rows = utilizationByOrg(organizations, sim.allocations, sessions, assets);
    const total = rows.reduce((n, r) => n + r.total, 0);
    expect(total).toBe(sim.allocations.filter((a) => a.approved).length);
    expect(total).toBeGreaterThan(0);
  });

  it("no asset is allocated twice in one (date, slot) across the whole season", () => {
    const seen = new Set<string>();
    for (const a of sim.allocations) {
      const s = sessions.find((x) => x.id === a.session_id)!;
      const key = `${s.date}|${s.slot}|${a.asset_id}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
