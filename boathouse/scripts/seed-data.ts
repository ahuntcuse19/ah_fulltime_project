// SPEC.md Section 10 with amendments A1, A2, A6 and the PLAN.md decisions.
// Every value here is normative; names are invented per 10.2 ("names may be invented").

import type {
  Asset,
  AssetClass,
  DamageEvent,
  Entitlement,
  Organization,
  Part,
  ProgramType,
  Session,
  SkillTier,
  Slot,
} from "@/engine/types";
import { SEATS_BY_CLASS } from "@/engine/types";
import { SEASON_YEAR, addDays, isoWeekday, weekMondays } from "@/engine/dates";
import { ids } from "@/lib/ids";

// ---------- 10.1 organizations ----------

export const ORG_NAMES = {
  club: "Harbor Rowing Club",
  college: "Riverside University Crew",
  community: "Eastside Community Rowing",
} as const;

export const organizations: Organization[] = [
  { id: ids.org(ORG_NAMES.club), name: ORG_NAMES.club, type: "club", priority_tier: 2, default_skill_tier: "intermediate", annual_fee_cents: 1_800_000 },
  { id: ids.org(ORG_NAMES.college), name: ORG_NAMES.college, type: "college", priority_tier: 1, default_skill_tier: "competitive", annual_fee_cents: 3_600_000 },
  { id: ids.org(ORG_NAMES.community), name: ORG_NAMES.community, type: "community_program", priority_tier: 3, default_skill_tier: "novice", annual_fee_cents: 600_000 },
];
export const CLUB = organizations[0]!.id;
export const COLLEGE = organizations[1]!.id;
export const COMMUNITY = organizations[2]!.id;

// ---------- 10.2 assets (19 shells per decision A, 6 oar sets) ----------

const REPLACEMENT_CENTS: Record<AssetClass, number> = {
  "shell_8+": 6_500_000,
  "shell_4+": 3_500_000,
  shell_2x: 1_800_000,
  shell_1x: 1_200_000,
  "shell_2-": 0, // not seeded
  shell_4x: 0, // not seeded
  oar_set_sweep: 320_000, // decision C
  oar_set_scull: 160_000, // decision C
};

/** 10.2: purchase cost = replacement × (1 − 0.03 × age), rounded to dollars. */
export function purchaseCostCents(replacementCents: number, yearBuilt: number): number {
  const age = SEASON_YEAR - yearBuilt;
  const dollars = Math.round((replacementCents / 100) * (1 - 0.03 * age));
  return dollars * 100;
}

interface AssetSpec {
  name: string;
  cls: AssetClass;
  tier: SkillTier;
  year: number;
  owner: string | null;
  shared: boolean;
  donor: string | null;
  rack: string;
}

const A: AssetSpec[] = [
  // 8+ (seven, per decision A)
  { name: "The Meridian", cls: "shell_8+", tier: "competitive", year: 2022, owner: COLLEGE, shared: false, donor: "The Meridian Family Foundation", rack: "Bay 1, rack 1" },
  { name: "Riverside Blue", cls: "shell_8+", tier: "competitive", year: 2019, owner: COLLEGE, shared: false, donor: "Class of 1994", rack: "Bay 1, rack 2" },
  { name: "The Ashford", cls: "shell_8+", tier: "intermediate", year: 2016, owner: null, shared: true, donor: "Margaret Ashford", rack: "Bay 1, rack 3" }, // A1, college standing
  { name: "Club Fifteen", cls: "shell_8+", tier: "intermediate", year: 2015, owner: CLUB, shared: true, donor: "Harbor Rowing Club Boosters", rack: "Bay 1, rack 4" }, // A1
  { name: "The Halden", cls: "shell_8+", tier: "intermediate", year: 2013, owner: null, shared: true, donor: "Peter and Ruth Halden", rack: "Bay 2, rack 1" }, // club standing; 2013 tie winner
  { name: "The Brackett", cls: "shell_8+", tier: "intermediate", year: 2011, owner: null, shared: true, donor: null, rack: "Bay 2, rack 2" },
  { name: "The Lockwood", cls: "shell_8+", tier: "novice", year: 2007, owner: null, shared: true, donor: null, rack: "Bay 2, rack 3" },
  // 4+
  { name: "Riverside Gold", cls: "shell_4+", tier: "competitive", year: 2021, owner: COLLEGE, shared: false, donor: "Riverside Alumni Rowing Association", rack: "Bay 2, rack 4" },
  { name: "The Marlowe", cls: "shell_4+", tier: "intermediate", year: 2016, owner: null, shared: true, donor: "Eleanor Marlowe", rack: "Bay 3, rack 1" },
  { name: "The Pemberton", cls: "shell_4+", tier: "intermediate", year: 2012, owner: null, shared: true, donor: "James Pemberton", rack: "Bay 3, rack 2" }, // decision C extra donor
  { name: "The Kestrel", cls: "shell_4+", tier: "novice", year: 2009, owner: null, shared: true, donor: null, rack: "Bay 3, rack 3" },
  // 2x
  { name: "Harbor Pair", cls: "shell_2x", tier: "intermediate", year: 2018, owner: CLUB, shared: true, donor: null, rack: "Bay 3, rack 4" },
  { name: "The Whitcombe", cls: "shell_2x", tier: "intermediate", year: 2014, owner: null, shared: true, donor: "Dr. Alan Whitcombe", rack: "Bay 4, rack 1" },
  { name: "The Sandpiper", cls: "shell_2x", tier: "novice", year: 2010, owner: null, shared: true, donor: "The Sandpiper Fund", rack: "Bay 4, rack 2" }, // decision C extra donor
  { name: "The Driftwood", cls: "shell_2x", tier: "novice", year: 2006, owner: null, shared: true, donor: null, rack: "Bay 4, rack 3" },
  // 1x
  { name: "The Falcon", cls: "shell_1x", tier: "competitive", year: 2023, owner: null, shared: true, donor: "Anonymous donor", rack: "Bay 4, rack 4" },
  { name: "The Heron", cls: "shell_1x", tier: "intermediate", year: 2017, owner: null, shared: true, donor: "Susan Heron", rack: "Bay 5, rack 1" },
  { name: "The Osprey", cls: "shell_1x", tier: "intermediate", year: 2013, owner: null, shared: true, donor: null, rack: "Bay 5, rack 2" },
  { name: "The Minnow", cls: "shell_1x", tier: "novice", year: 2008, owner: null, shared: true, donor: null, rack: "Bay 5, rack 3" },
  // oar sets
  { name: "Sweep Set A", cls: "oar_set_sweep", tier: "novice", year: 2021, owner: null, shared: true, donor: null, rack: "Oar rack 1" },
  { name: "Sweep Set B", cls: "oar_set_sweep", tier: "novice", year: 2018, owner: null, shared: true, donor: null, rack: "Oar rack 1" },
  { name: "Sweep Set C", cls: "oar_set_sweep", tier: "novice", year: 2015, owner: null, shared: true, donor: null, rack: "Oar rack 2" },
  { name: "Sweep Set D", cls: "oar_set_sweep", tier: "novice", year: 2010, owner: null, shared: true, donor: null, rack: "Oar rack 2" },
  { name: "Scull Set A", cls: "oar_set_scull", tier: "novice", year: 2019, owner: null, shared: true, donor: null, rack: "Oar rack 3" },
  { name: "Scull Set B", cls: "oar_set_scull", tier: "novice", year: 2012, owner: null, shared: true, donor: null, rack: "Oar rack 3" },
];

export const assets: Asset[] = A.map((s) => ({
  id: ids.asset(s.name),
  name: s.name,
  asset_class: s.cls,
  seats: SEATS_BY_CLASS[s.cls],
  quality_tier: s.tier,
  owner_org_id: s.owner,
  shared: s.shared,
  year_built: s.year,
  purchase_cost_cents: purchaseCostCents(REPLACEMENT_CENTS[s.cls], s.year),
  replacement_cost_cents: REPLACEMENT_CENTS[s.cls],
  donor_name: s.donor,
  status: "on_water",
  rack_location: s.rack,
  retired_on: null,
}));

export function assetByName(name: string): Asset {
  const a = assets.find((x) => x.name === name);
  if (!a) throw new Error(`No seeded asset named ${name}`);
  return a;
}

// ---------- 10.3 entitlements with A2 and A7 ----------

function eligibleRow(orgId: string, assetId: string): Entitlement {
  return { id: ids.entitlement(orgId, assetId, "eligible", null), org_id: orgId, asset_id: assetId, kind: "eligible", slot: null, days: null };
}
function standingRow(orgId: string, assetId: string, slot: Slot, days: number[]): Entitlement {
  return { id: ids.entitlement(orgId, assetId, "standing", slot), org_id: orgId, asset_id: assetId, kind: "standing", slot, days };
}

const houseShells = assets.filter((a) => a.owner_org_id === null && a.asset_class.startsWith("shell_"));
const oarSets = assets.filter((a) => a.asset_class.startsWith("oar_set_"));

export const entitlements: Entitlement[] = [
  // College: eligible on house shells with quality intermediate or competitive, plus Club Fifteen (10.3 note).
  ...houseShells.filter((a) => a.quality_tier !== "novice").map((a) => eligibleRow(COLLEGE, a.id)),
  eligibleRow(COLLEGE, assetByName("Club Fifteen").id),
  standingRow(COLLEGE, assetByName("The Ashford").id, "AM1", [1, 2, 3, 4, 5]),
  // Club: eligible on all house shells; standing on the 2013 8+ at AM2 Mon, Wed, Fri.
  ...houseShells.map((a) => eligibleRow(CLUB, a.id)),
  standingRow(CLUB, assetByName("The Halden").id, "AM2", [1, 3, 5]),
  // Community: eligible on house shells with quality novice or intermediate.
  ...houseShells.filter((a) => a.quality_tier !== "competitive").map((a) => eligibleRow(COMMUNITY, a.id)),
  // A2: every organization eligible on every oar set. A7: never standing.
  ...organizations.flatMap((o) => oarSets.map((a) => eligibleRow(o.id, a.id))),
];

/** 4.3: at most one standing row per (asset, slot, weekday). Throws on overlap. */
export function assertStandingUnique(rows: Entitlement[]): void {
  const seen = new Set<string>();
  for (const e of rows) {
    if (e.kind !== "standing") continue;
    for (const d of e.days ?? []) {
      const key = `${e.asset_id}|${e.slot}|${d}`;
      if (seen.has(key)) throw new Error(`Duplicate standing claim on ${key}`);
      seen.add(key);
    }
  }
}

// ---------- 10.4 sessions with A6 program ----------

/** created_at = season start (midnight America/New_York, EST in March) plus 0, 1, 2 minutes. */
const SEASON_START_TS_MS = Date.parse("2026-03-02T00:00:00-05:00");
const CREATED_AT: Record<string, string> = {
  [COLLEGE]: new Date(SEASON_START_TS_MS).toISOString(),
  [CLUB]: new Date(SEASON_START_TS_MS + 60_000).toISOString(),
  [COMMUNITY]: new Date(SEASON_START_TS_MS + 120_000).toISOString(),
};

interface SessionRule {
  org: string;
  slot: Slot;
  weekdays: number[];
  skill: SkillTier;
  seats: number;
  program: (weekday: number) => ProgramType;
}

const RULES: SessionRule[] = [
  { org: COLLEGE, slot: "AM1", weekdays: [1, 2, 3, 4, 5], skill: "competitive", seats: 24, program: (d) => (d === 2 || d === 4 ? "womens" : "mens") },
  { org: COLLEGE, slot: "AM2", weekdays: [6], skill: "competitive", seats: 16, program: () => "mixed" },
  { org: CLUB, slot: "AM2", weekdays: [1, 3, 5], skill: "intermediate", seats: 16, program: () => "mixed" },
  { org: CLUB, slot: "PM1", weekdays: [2, 4], skill: "intermediate", seats: 8, program: () => "mixed" },
  { org: CLUB, slot: "AM1", weekdays: [6, 7], skill: "intermediate", seats: 12, program: () => "mixed" },
  { org: COMMUNITY, slot: "PM1", weekdays: [1, 2, 3, 4, 5], skill: "novice", seats: 12, program: () => "mixed" },
  { org: COMMUNITY, slot: "AM2", weekdays: [7], skill: "novice", seats: 8, program: () => "mixed" },
];

export const sessions: Session[] = weekMondays().flatMap((monday) =>
  Array.from({ length: 7 }, (_, i) => addDays(monday, i)).flatMap((date) => {
    const wd = isoWeekday(date);
    return RULES.filter((r) => r.weekdays.includes(wd)).map<Session>((r) => ({
      id: ids.session(r.org, date, r.slot),
      org_id: r.org,
      date,
      slot: r.slot,
      skill_tier: r.skill,
      requested_seats: r.seats,
      source: "standing",
      raw_request_text: null,
      status: "requested",
      created_at: CREATED_AT[r.org]!,
      program: r.program(wd),
    }));
  }),
);

// ---------- 10.5 damage events ----------

interface EventSpec {
  n: number;
  date: string;
  asset: string;
  component: DamageEvent["component"];
  severity: DamageEvent["severity"];
  status: DamageEvent["status"];
  resolved: string | null;
  cost: number;
  liable: string | null;
  description: string;
}

const E: EventSpec[] = [
  { n: 1, date: "2026-03-19", asset: "The Brackett", component: "rigger", severity: "caution", status: "fixed", resolved: "2026-03-24", cost: 42_000, liable: CLUB, description: "Bent starboard rigger, 4 seat" },
  { n: 2, date: "2026-04-02", asset: "Riverside Blue", component: "hull", severity: "off_water", status: "fixed", resolved: "2026-04-16", cost: 280_000, liable: COLLEGE, description: "Hull puncture forward of bow deck" },
  { n: 3, date: "2026-04-22", asset: "The Kestrel", component: "seat_slide", severity: "cosmetic", status: "fixed", resolved: "2026-04-23", cost: 8_500, liable: null, description: "Worn seat wheels, 2 seat" },
  { n: 4, date: "2026-05-11", asset: "The Driftwood", component: "fin_skeg", severity: "off_water", status: "fixed", resolved: "2026-05-25", cost: 65_000, liable: COMMUNITY, description: "Skeg sheared off on the dock" },
  { n: 5, date: "2026-06-03", asset: "The Osprey", component: "oarlock", severity: "caution", status: "fixed", resolved: "2026-06-05", cost: 6_000, liable: null, description: "Cracked oarlock gate" },
  { n: 6, date: "2026-07-14", asset: "The Lockwood", component: "hull", severity: "off_water", status: "parts_ordered", resolved: null, cost: 390_000, liable: null, description: "Split hull seam amidships; repair kit on order (estimate)" },
  { n: 7, date: "2026-08-20", asset: "Harbor Pair", component: "foot_stretcher", severity: "caution", status: "open", resolved: null, cost: 0, liable: null, description: "Loose foot stretcher shoe, bow seat" },
  { n: 8, date: "2026-09-01", asset: "Sweep Set D", component: "oar", severity: "off_water", status: "fixed", resolved: "2026-09-08", cost: 110_000, liable: CLUB, description: "Two oars snapped at the sleeve" },
];

export const damageEvents: DamageEvent[] = E.map((e) => {
  const assetId = assetByName(e.asset).id;
  return {
    id: ids.damageEvent(assetId, e.date, e.component, e.n),
    asset_id: assetId,
    reported_on: e.date,
    reported_by_org_id: e.liable,
    liable_org_id: e.liable,
    component: e.component,
    description: e.description,
    severity: e.severity,
    status: e.status,
    resolved_on: e.resolved,
    cost_cents: e.cost,
  };
});

// ---------- 10.6 parts (unit costs per decision C) ----------

const P: Omit<Part, "id">[] = [
  { name: "Oarlock, Concept2", component: "oarlock", qty_in_stock: 12, qty_on_order: 0, unit_cost_cents: 2_800, reorder_threshold: 8 },
  { name: "Seat wheels", component: "seat_slide", qty_in_stock: 20, qty_on_order: 0, unit_cost_cents: 900, reorder_threshold: 10 },
  { name: "Foot stretcher shoes", component: "foot_stretcher", qty_in_stock: 3, qty_on_order: 0, unit_cost_cents: 9_500, reorder_threshold: 4 },
  { name: "Rigger bolts", component: "rigger", qty_in_stock: 40, qty_on_order: 0, unit_cost_cents: 200, reorder_threshold: 20 },
  { name: "Skeg", component: "fin_skeg", qty_in_stock: 0, qty_on_order: 1, unit_cost_cents: 14_000, reorder_threshold: 1 },
  { name: "Hull repair kit", component: "hull", qty_in_stock: 2, qty_on_order: 0, unit_cost_cents: 18_000, reorder_threshold: 1 },
];

export const parts: Part[] = P.map((p) => ({ id: ids.part(p.name), ...p }));

// ---------- 10.7 approval ----------

/** Weeks whose Monday is on or before this date are approved. */
export const LAST_APPROVED_MONDAY = "2026-09-07"; // week containing 2026-09-13
