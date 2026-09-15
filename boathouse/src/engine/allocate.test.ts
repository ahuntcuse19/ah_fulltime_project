import { beforeEach, describe, expect, it } from "vitest";
import { allocateWeek } from "./allocate";
import { asset, damage, eligible, org, resetIds, session, standing } from "./fixtures";

beforeEach(() => resetIds());

describe("Section 6.3 worked example (must reproduce exactly)", () => {
  it("Org A takes the 2022 then 2015 8+; Org B gets the 4+ and is partially_allocated", () => {
    const a = org({ id: "A", priority_tier: 1, default_skill_tier: "competitive" });
    const b = org({ id: "B", priority_tier: 2, default_skill_tier: "intermediate" });
    const e2022 = asset("shell_8+", "competitive", 2022, { id: "e2022" });
    const e2015 = asset("shell_8+", "competitive", 2015, { id: "e2015" });
    const f2019 = asset("shell_4+", "intermediate", 2019, { id: "f2019" });
    const assets = [f2019, e2015, e2022]; // deliberately unsorted
    const entitlements = assets.flatMap((x) => [eligible("A", x.id), eligible("B", x.id)]);
    const sA = session("A", "2026-04-07", "AM1", "competitive", 16, {
      id: "sA",
      created_at: "2026-03-02T05:00:00.000Z",
    });
    const sB = session("B", "2026-04-07", "AM1", "intermediate", 8, {
      id: "sB",
      created_at: "2026-03-02T05:01:00.000Z",
    });

    const r = allocateWeek({
      sessions: [sB, sA],
      organizations: [b, a],
      assets,
      entitlements,
      damageEvents: [],
    });

    const shellsA = r.allocations.filter((x) => x.session_id === "sA").map((x) => x.asset_id);
    const shellsB = r.allocations.filter((x) => x.session_id === "sB").map((x) => x.asset_id);
    expect(shellsA).toEqual(["e2022", "e2015"]);
    expect(shellsB).toEqual(["f2019"]);
    expect(r.allocations.map((x) => x.basis)).toEqual(["priority", "priority", "priority"]);
    expect(r.sessionStatuses).toEqual({ sA: "allocated", sB: "partially_allocated" });
    // No oar sets exist in the example, so every shell shows the "no oars" warning.
    expect(r.warnings.sA?.noOars).toBe(2);
    expect(r.warnings.sB?.noOars).toBe(1);
  });
});

describe("engine rules", () => {
  it("standing claim beats priority", () => {
    const a = org({ id: "A", priority_tier: 1 });
    const b = org({ id: "B", priority_tier: 2 });
    const x = asset("shell_8+", "intermediate", 2016, { id: "x" });
    const sA = session("A", "2026-04-07", "AM1", "competitive", 8, { id: "sA" });
    const sB = session("B", "2026-04-07", "AM1", "intermediate", 8, { id: "sB" });
    const r = allocateWeek({
      sessions: [sA, sB],
      organizations: [a, b],
      assets: [x],
      entitlements: [eligible("A", "x"), standing("B", "x", "AM1", [2])],
      damageEvents: [],
    });
    expect(r.allocations).toEqual([{ session_id: "sB", asset_id: "x", basis: "standing" }]);
    expect(r.sessionStatuses).toEqual({ sA: "unfilled", sB: "allocated" });
  });

  it("standing claim is skipped on days and slots it does not cover", () => {
    const b = org({ id: "B", priority_tier: 2 });
    const x = asset("shell_8+", "intermediate", 2016, { id: "x" });
    const sB = session("B", "2026-04-08", "AM2", "intermediate", 8, { id: "sB" }); // Wednesday
    const r = allocateWeek({
      sessions: [sB],
      organizations: [b],
      assets: [x],
      entitlements: [standing("B", "x", "AM1", [3])], // right day, wrong slot
      damageEvents: [],
    });
    // A standing row still counts as an entitlement (4.3), so the shell arrives by priority, not standing.
    expect(r.allocations).toEqual([{ session_id: "sB", asset_id: "x", basis: "priority" }]);
    expect(r.sessionStatuses.sB).toBe("allocated");
  });

  it("skill rank gate: a novice session never gets an intermediate or competitive shell", () => {
    const c = org({ id: "C", priority_tier: 3, default_skill_tier: "novice" });
    const nov = asset("shell_4+", "novice", 2009, { id: "nov" });
    const int = asset("shell_8+", "intermediate", 2016, { id: "int" });
    const comp = asset("shell_8+", "competitive", 2022, { id: "comp" });
    const s = session("C", "2026-04-08", "PM1", "novice", 12, { id: "s" });
    const r = allocateWeek({
      sessions: [s],
      organizations: [c],
      assets: [comp, int, nov],
      entitlements: [eligible("C", "nov"), eligible("C", "int"), eligible("C", "comp")],
      damageEvents: [],
    });
    expect(r.allocations.map((x) => x.asset_id)).toEqual(["nov"]);
    expect(r.sessionStatuses.s).toBe("partially_allocated");
  });

  it("same asset is never allocated twice in one (date, slot), but may be reused in another slot", () => {
    const a = org({ id: "A", priority_tier: 1 });
    const b = org({ id: "B", priority_tier: 2 });
    const x = asset("shell_8+", "intermediate", 2016, { id: "x" });
    const sA = session("A", "2026-04-07", "AM1", "competitive", 8, { id: "sA" });
    const sB = session("B", "2026-04-07", "AM1", "intermediate", 8, { id: "sB" });
    const sB2 = session("B", "2026-04-07", "PM1", "intermediate", 8, { id: "sB2" });
    const r = allocateWeek({
      sessions: [sA, sB, sB2],
      organizations: [a, b],
      assets: [x],
      entitlements: [eligible("A", "x"), eligible("B", "x")],
      damageEvents: [],
    });
    expect(r.allocations).toEqual([
      { session_id: "sA", asset_id: "x", basis: "priority" },
      { session_id: "sB2", asset_id: "x", basis: "priority" },
    ]);
    expect(r.sessionStatuses).toEqual({ sA: "allocated", sB: "unfilled", sB2: "allocated" });
  });

  it("oar sets follow shells by class, newest first, and count the shortfall", () => {
    const a = org({ id: "A", priority_tier: 1 });
    const eight = asset("shell_8+", "intermediate", 2016, { id: "eight" });
    const dbl = asset("shell_2x", "intermediate", 2014, { id: "dbl" });
    const single = asset("shell_1x", "intermediate", 2017, { id: "single" });
    const sweepOld = asset("oar_set_sweep", "novice", 2010, { id: "sweepOld", name: "Sweep 2010" });
    const sweepNew = asset("oar_set_sweep", "novice", 2021, { id: "sweepNew", name: "Sweep 2021" });
    const scull = asset("oar_set_scull", "novice", 2019, { id: "scull" });
    const s = session("A", "2026-04-07", "AM1", "intermediate", 11, { id: "s" });
    const assets = [scull, sweepOld, sweepNew, single, dbl, eight];
    const r = allocateWeek({
      sessions: [s],
      organizations: [a],
      assets,
      entitlements: assets.map((x) => eligible("A", x.id)),
      damageEvents: [],
    });
    const ids = r.allocations.map((x) => x.asset_id);
    expect(ids).toEqual(["eight", "dbl", "single", "sweepNew", "scull"]);
    expect(r.warnings.s).toEqual({ caution: [], noOars: 1 }); // two scull shells, one scull set
    expect(r.sessionStatuses.s).toBe("allocated");
  });

  it("caution assets are allocated with a warning", () => {
    const a = org({ id: "A", priority_tier: 1 });
    const x = asset("shell_8+", "intermediate", 2016, { id: "x" });
    const s = session("A", "2026-04-07", "AM1", "intermediate", 8, { id: "s" });
    const r = allocateWeek({
      sessions: [s],
      organizations: [a],
      assets: [x],
      entitlements: [eligible("A", "x")],
      damageEvents: [damage("x", "2026-04-01", "caution", "open", null)],
    });
    expect(r.allocations.map((y) => y.asset_id)).toEqual(["x"]);
    expect(r.warnings.s?.caution).toEqual(["x"]);
  });

  it("off_water assets are excluded on the dates the event is active, inclusive of resolved_on", () => {
    const a = org({ id: "A", priority_tier: 1 });
    const x = asset("shell_8+", "intermediate", 2016, { id: "x" });
    const ev = damage("x", "2026-04-02", "off_water", "fixed", "2026-04-16");
    const mk = (date: string, id: string) => session("A", date, "AM1", "intermediate", 8, { id });
    const r = allocateWeek({
      sessions: [mk("2026-04-01", "before"), mk("2026-04-02", "start"), mk("2026-04-16", "end"), mk("2026-04-17", "after")],
      organizations: [a],
      assets: [x],
      entitlements: [eligible("A", "x")],
      damageEvents: [ev],
    });
    expect(r.allocations.map((y) => y.session_id)).toEqual(["before", "after"]);
    expect(r.sessionStatuses).toEqual({ before: "allocated", start: "unfilled", end: "unfilled", after: "allocated" });
  });

  it("re-run preserves approved and manual rows: they count toward need and block the asset", () => {
    const a = org({ id: "A", priority_tier: 1 });
    const b = org({ id: "B", priority_tier: 2 });
    const x = asset("shell_8+", "intermediate", 2016, { id: "x" });
    const y = asset("shell_8+", "intermediate", 2013, { id: "y" });
    const sweep = asset("oar_set_sweep", "novice", 2021, { id: "sweep" });
    const sA = session("A", "2026-04-07", "AM1", "intermediate", 8, { id: "sA" });
    const sB = session("B", "2026-04-07", "AM1", "intermediate", 8, { id: "sB" });
    const assets = [x, y, sweep];
    const entitlements = assets.flatMap((z) => [eligible("A", z.id), eligible("B", z.id)]);

    // A manual override gave the older shell y to A, keeping its oar set. Re-run:
    const r = allocateWeek({
      sessions: [sA, sB],
      organizations: [a, b],
      assets,
      entitlements,
      damageEvents: [],
      kept: [
        { session_id: "sA", asset_id: "y", basis: "manual" },
        { session_id: "sA", asset_id: "sweep", basis: "priority" },
      ],
    });
    // A needs nothing new; B takes x; no sweep set is left for B.
    expect(r.allocations).toEqual([{ session_id: "sB", asset_id: "x", basis: "priority" }]);
    expect(r.sessionStatuses).toEqual({ sA: "allocated", sB: "allocated" });
    expect(r.warnings.sB?.noOars).toBe(1);
    expect(r.warnings.sA?.noOars).toBe(0);
  });

  it("processes (date, slot) pairs chronologically and sessions by tier then created_at", () => {
    const a = org({ id: "A", priority_tier: 2 });
    const b = org({ id: "B", priority_tier: 2 });
    const x = asset("shell_4+", "intermediate", 2016, { id: "x" });
    const sA = session("A", "2026-04-07", "AM1", "intermediate", 4, { id: "sA", created_at: "2026-03-02T05:01:00.000Z" });
    const sB = session("B", "2026-04-07", "AM1", "intermediate", 4, { id: "sB", created_at: "2026-03-02T05:00:00.000Z" });
    const r = allocateWeek({
      sessions: [sA, sB],
      organizations: [a, b],
      assets: [x],
      entitlements: [eligible("A", "x"), eligible("B", "x")],
      damageEvents: [],
    });
    expect(r.allocations.map((z) => z.session_id)).toEqual(["sB"]);
  });

  it("a session is never given a shell it is not entitled to, and unshared assets stay with the owner", () => {
    const a = org({ id: "A", priority_tier: 1 });
    const b = org({ id: "B", priority_tier: 2 });
    const owned = asset("shell_8+", "competitive", 2022, { id: "owned", owner_org_id: "A", shared: false });
    const sB = session("B", "2026-04-07", "AM1", "competitive", 8, { id: "sB" });
    const r = allocateWeek({
      sessions: [sB],
      organizations: [a, b],
      assets: [owned],
      entitlements: [eligible("B", "owned")], // row exists but asset is not shared
      damageEvents: [],
    });
    expect(r.allocations).toEqual([]);
  });
});
