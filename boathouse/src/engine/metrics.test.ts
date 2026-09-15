import { beforeEach, describe, expect, it } from "vitest";
import { allocation, asset, damage, org, resetIds, session } from "./fixtures";
import {
  availableAssetDays,
  costShare,
  daysOffWater,
  fleetMedianUtilization,
  formatDollars,
  formatPct,
  isReplacementCandidate,
  median,
  repairRatio,
  repairSpendCents,
  roundHalfUp,
  utilization,
  utilizationByOrg,
} from "./metrics";
import { deriveStatusAsOf, deriveStoredStatus } from "./status";

beforeEach(() => resetIds());

describe("rounding and formatting (8.6)", () => {
  it("rounds half up on decimals", () => {
    expect(roundHalfUp(1.05, 1)).toBe(1.1);
    expect(roundHalfUp(1.005, 2)).toBe(1.01);
    expect(roundHalfUp(2.25, 1)).toBe(2.3);
    expect(roundHalfUp(14.95, 1)).toBe(15.0);
  });
  it("formats percentages and dollars", () => {
    expect(formatPct(1, 3)).toBe("33.3%");
    expect(formatPct(0, 0)).toBe("n/a");
    expect(formatDollars(6_500_000)).toBe("$65,000.00");
    expect(formatDollars(42_000)).toBe("$420.00");
    expect(formatDollars(5)).toBe("$0.05");
  });
});

describe("status derivation (4.6 and 8.1)", () => {
  it("as-of status is inclusive of reported_on and resolved_on; stored status ignores dates", () => {
    const x = asset("shell_8+", "competitive", 2019, { id: "x" });
    const ev = damage("x", "2026-04-02", "off_water", "fixed", "2026-04-16");
    expect(deriveStatusAsOf(x, [ev], "2026-04-01")).toBe("on_water");
    expect(deriveStatusAsOf(x, [ev], "2026-04-02")).toBe("off_water");
    expect(deriveStatusAsOf(x, [ev], "2026-04-16")).toBe("off_water");
    expect(deriveStatusAsOf(x, [ev], "2026-04-17")).toBe("on_water");
    expect(deriveStoredStatus(x, [ev])).toBe("on_water");
    const open = damage("x", "2026-07-14", "off_water", "parts_ordered", null);
    expect(deriveStoredStatus(x, [open])).toBe("off_water");
    expect(deriveStatusAsOf(x, [open], "2026-11-01")).toBe("off_water");
  });
  it("off_water outranks caution; cosmetic never changes status; retired wins", () => {
    const x = asset("shell_8+", "competitive", 2019, { id: "x" });
    const evs = [
      damage("x", "2026-04-01", "caution", "open", null),
      damage("x", "2026-04-03", "off_water", "open", null),
      damage("x", "2026-04-05", "cosmetic", "open", null),
    ];
    expect(deriveStatusAsOf(x, evs, "2026-04-02")).toBe("caution");
    expect(deriveStatusAsOf(x, evs, "2026-04-04")).toBe("off_water");
    expect(deriveStatusAsOf(x, [evs[2]!], "2026-04-06")).toBe("on_water");
    const r = asset("shell_8+", "competitive", 2019, { id: "r", status: "retired", retired_on: "2026-05-01" });
    expect(deriveStatusAsOf(r, [], "2026-04-30")).toBe("on_water");
    expect(deriveStatusAsOf(r, [], "2026-05-01")).toBe("retired");
  });
});

describe("8.1 definitions", () => {
  it("acceptance test 5 arithmetic: 15 days off water, denominator per A4", () => {
    const x = asset("shell_8+", "competitive", 2019, { id: "x" });
    const ev = damage("x", "2026-04-02", "off_water", "fixed", "2026-04-16", 280_000);
    expect(daysOffWater(x, [ev], "2026-09-15")).toBe(15);
    // 2026-03-02 .. 2026-09-15 inclusive is 198 days; minus 15 off water.
    expect(availableAssetDays(x, [ev], "2026-09-15")).toBe(198 - 15);
    expect(availableAssetDays(x, [ev], "2027-01-01")).toBe(245 - 15);
  });

  it("utilization, repair spend on fixed events only, replacement candidate rule", () => {
    const x = asset("shell_8+", "novice", 2007, { id: "x", replacement_cost_cents: 6_500_000 });
    const s = session("o", "2026-03-03", "PM1", "novice", 8, { id: "s" });
    const allocs = [allocation("s", "x", "priority", true), allocation("s", "x", "priority", false)];
    const u = utilization(x, allocs, [], "2026-03-02");
    expect(u).toBeCloseTo(100 / 3, 6); // 1 approved session-out over 1 day x 3
    const unresolved = damage("x", "2026-07-14", "off_water", "parts_ordered", null, 390_000);
    expect(repairSpendCents("x", [unresolved])).toBe(0);
    expect(isReplacementCandidate(x, [unresolved])).toBe(false);
    const fixed = damage("x", "2026-07-14", "off_water", "fixed", "2026-08-01", 975_000);
    expect(repairRatio(x, [fixed])).toBeCloseTo(15, 6);
    expect(isReplacementCandidate(x, [fixed])).toBe(true);
    const young = asset("shell_8+", "competitive", 2019, { id: "y", replacement_cost_cents: 6_500_000 });
    expect(isReplacementCandidate(young, [damage("y", "2026-04-02", "hull" as never, "fixed", "2026-04-16", 975_000)])).toBe(false);
  });

  it("median and fleet median exclude n/a shells", () => {
    expect(median([3, null, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([null])).toBeNull();
    const a = asset("shell_1x", "novice", 2008, { id: "a" });
    const b = asset("shell_1x", "novice", 2008, { id: "b", status: "retired", retired_on: "2026-03-02" });
    const oar = asset("oar_set_scull", "novice", 2019, { id: "oar" });
    const s = session("o", "2026-03-02", "AM1", "novice", 1, { id: "s" });
    const allocs = [allocation("s", "a", "priority", true), allocation("s", "oar", "priority", true)];
    expect(fleetMedianUtilization([a, b, oar], allocs, [], "2026-03-02")).toBeCloseTo(100 / 3, 6);
  });
});

describe("8.2 and 8.5", () => {
  it("splits owned and borrowed, sums to the approved total, and computes fee per session-out", () => {
    const college = org({ id: "college", priority_tier: 1, annual_fee_cents: 3_600_000 });
    const club = org({ id: "club", priority_tier: 2, annual_fee_cents: 1_800_000 });
    const owned = asset("shell_8+", "competitive", 2022, { id: "owned", owner_org_id: "college", shared: false });
    const house = asset("shell_8+", "intermediate", 2016, { id: "house" });
    const oar = asset("oar_set_sweep", "novice", 2021, { id: "oar" });
    const s1 = session("college", "2026-03-02", "AM1", "competitive", 16, { id: "s1" });
    const s2 = session("club", "2026-03-02", "AM2", "intermediate", 8, { id: "s2" });
    const allocs = [
      allocation("s1", "owned", "priority", true),
      allocation("s1", "house", "standing", true),
      allocation("s1", "oar", "priority", true),
      allocation("s2", "house", "standing", true),
      allocation("s2", "oar", "priority", false), // unapproved counts nowhere
    ];
    const rows = utilizationByOrg([college, club], allocs, [s1, s2], [owned, house, oar]);
    expect(rows.map((r) => [r.org.id, r.borrowed, r.owned, r.total])).toEqual([
      ["college", 2, 1, 3],
      ["club", 1, 0, 1],
    ]);
    expect(rows.reduce((n, r) => n + r.total, 0)).toBe(allocs.filter((a) => a.approved).length);
    expect(rows[0]!.share).toBeCloseTo(75, 6);
    expect(rows[0]!.fee_per_session_out_cents).toBe(1_200_000);
    const cs = costShare([college, club], [damage("house", "2026-03-19", "caution", "open", null, 42_000, { liable_org_id: "club" })], rows);
    expect(cs.map((r) => [r.org.id, r.liable_damage_cents])).toEqual([
      ["college", 0],
      ["club", 42_000],
    ]);
  });
});
