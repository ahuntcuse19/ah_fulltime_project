// Section 6.2, 6.5: the allocation loop. Pure: plain objects in, plain objects out.

import type {
  Allocation,
  AllocationBasis,
  Asset,
  DamageEvent,
  Entitlement,
  IsoDate,
  Organization,
  Session,
  SessionStatus,
  Slot,
} from "./types";
import { SLOT_ORDER, isOarSetClass, isShellClass } from "./types";
import { isoWeekday } from "./dates";
import { deriveStatusAsOf } from "./status";
import { isOarSetEligible, isShellEligible, oarClassFor, skillRank } from "./eligibility";

export interface AllocateInput {
  /** Sessions to allocate. Cancelled sessions are ignored. */
  sessions: readonly Session[];
  organizations: readonly Organization[];
  assets: readonly Asset[];
  entitlements: readonly Entitlement[];
  damageEvents: readonly DamageEvent[];
  /**
   * Rows preserved across a re-run (approved or manual, 6.4 and 6.6).
   * They count toward seat need, occupy their asset at that (date, slot),
   * and are never returned again in `allocations`.
   */
  kept?: readonly Pick<Allocation, "session_id" | "asset_id" | "basis">[];
}

export interface AllocationDraft {
  session_id: string;
  asset_id: string;
  basis: AllocationBasis;
}

export interface SessionWarnings {
  /** Asset ids allocated (kept or new) whose status on the date is caution. */
  caution: string[];
  /** Number of allocated shells without an oar set (6.5). */
  noOars: number;
}

export interface AllocateResult {
  /** New rows only. Kept rows are not repeated. */
  allocations: AllocationDraft[];
  sessionStatuses: Record<string, SessionStatus>;
  warnings: Record<string, SessionWarnings>;
}

/** Section 6.2 step 2 sort: seats desc, quality rank desc, year_built desc, name asc. */
export function sortEligibleShells(assets: Asset[]): Asset[] {
  return [...assets].sort(
    (a, b) =>
      b.seats - a.seats ||
      skillRank(b.quality_tier) - skillRank(a.quality_tier) ||
      b.year_built - a.year_built ||
      cmpStr(a.name, b.name),
  );
}

/** Section 6.5 sort: year_built desc, name asc. */
export function sortOarSets(assets: Asset[]): Asset[] {
  return [...assets].sort((a, b) => b.year_built - a.year_built || cmpStr(a.name, b.name));
}

function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function toUtcMs(ts: string): number {
  const ms = Date.parse(ts);
  if (Number.isNaN(ms)) throw new Error(`Bad timestamp: ${ts}`);
  return ms;
}

interface SessionState {
  session: Session;
  need: number;
  shells: Asset[]; // allocated shells in order (kept first, then new)
  oarSets: Asset[]; // allocated oar sets (kept first, then new)
}

export function allocateWeek(input: AllocateInput): AllocateResult {
  const assetById = new Map(input.assets.map((a) => [a.id, a]));
  const orgById = new Map(input.organizations.map((o) => [o.id, o]));
  const sessions = input.sessions.filter((s) => s.status !== "cancelled");
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  const keptBySession = new Map<string, Asset[]>();
  for (const k of input.kept ?? []) {
    if (!sessionById.has(k.session_id)) continue;
    const a = assetById.get(k.asset_id);
    if (!a) continue;
    const list = keptBySession.get(k.session_id) ?? [];
    list.push(a);
    keptBySession.set(k.session_id, list);
  }

  // Group by (date, slot) in chronological order.
  const groups = new Map<string, Session[]>();
  for (const s of sessions) {
    const key = `${s.date}|${s.slot}`;
    const g = groups.get(key) ?? [];
    g.push(s);
    groups.set(key, g);
  }
  const keys = [...groups.keys()].sort((a, b) => {
    const [da, sa] = a.split("|") as [IsoDate, Slot];
    const [db, sb] = b.split("|") as [IsoDate, Slot];
    return cmpStr(da, db) || SLOT_ORDER[sa] - SLOT_ORDER[sb];
  });

  const allocations: AllocationDraft[] = [];
  const sessionStatuses: Record<string, SessionStatus> = {};
  const warnings: Record<string, SessionWarnings> = {};

  for (const key of keys) {
    const [date, slot] = key.split("|") as [IsoDate, Slot];
    const weekday = isoWeekday(date);
    const groupSessions = groups.get(key)!;

    // Status as of this date, memoised per asset.
    const statusCache = new Map<string, ReturnType<typeof deriveStatusAsOf>>();
    const statusOn = (assetId: string) => {
      let s = statusCache.get(assetId);
      if (s === undefined) {
        const a = assetById.get(assetId);
        s = a ? deriveStatusAsOf(a, input.damageEvents, date) : "off_water";
        statusCache.set(assetId, s);
      }
      return s;
    };

    const taken = new Set<string>();
    const states = new Map<string, SessionState>();
    for (const s of groupSessions) {
      const kept = keptBySession.get(s.id) ?? [];
      const shells = kept.filter((a) => isShellClass(a.asset_class));
      const oarSets = kept.filter((a) => isOarSetClass(a.asset_class));
      for (const a of kept) taken.add(a.id);
      const keptSeats = shells.reduce((n, a) => n + a.seats, 0);
      states.set(s.id, {
        session: s,
        need: Math.max(0, s.requested_seats - keptSeats),
        shells,
        oarSets,
      });
    }
    const ctx = { statusOn, entitlements: input.entitlements, taken };
    const sessionsByOrg = new Map<string, Session>();
    for (const s of groupSessions) sessionsByOrg.set(s.org_id, s); // unique per (org, date, slot)

    // Step 1: standing claims. Deterministic order: asset name, then org id.
    const standing = input.entitlements
      .filter(
        (e) =>
          e.kind === "standing" &&
          e.slot === slot &&
          (e.days ?? []).includes(weekday) &&
          sessionsByOrg.has(e.org_id),
      )
      .sort(
        (a, b) =>
          cmpStr(assetById.get(a.asset_id)?.name ?? "", assetById.get(b.asset_id)?.name ?? "") ||
          cmpStr(a.org_id, b.org_id),
      );
    for (const e of standing) {
      const asset = assetById.get(e.asset_id);
      const session = sessionsByOrg.get(e.org_id);
      if (!asset || !session) continue;
      const st = states.get(session.id)!;
      if (!isShellEligible(asset, session, ctx)) continue;
      taken.add(asset.id);
      st.shells.push(asset);
      st.need = Math.max(0, st.need - asset.seats);
      allocations.push({ session_id: session.id, asset_id: asset.id, basis: "standing" });
    }

    // Step 2: priority fill. Sort by priority_tier asc, created_at asc, id asc for stability.
    const pending = [...states.values()]
      .filter((st) => st.need > 0)
      .sort(
        (a, b) =>
          (orgById.get(a.session.org_id)?.priority_tier ?? 99) -
            (orgById.get(b.session.org_id)?.priority_tier ?? 99) ||
          toUtcMs(a.session.created_at) - toUtcMs(b.session.created_at) ||
          cmpStr(a.session.id, b.session.id),
      );
    for (const st of pending) {
      const eligible = sortEligibleShells(
        input.assets.filter((a) => isShellEligible(a, st.session, ctx)),
      );
      for (const asset of eligible) {
        if (st.need <= 0) break;
        if (asset.seats > st.need) continue;
        taken.add(asset.id);
        st.shells.push(asset);
        st.need -= asset.seats;
        allocations.push({ session_id: st.session.id, asset_id: asset.id, basis: "priority" });
      }
    }

    // 6.5: oar sets. Walk shells in allocation order across sessions in step order:
    // sessions with standing claims first (in standing order), then priority order.
    const orderedSessionIds: string[] = [];
    for (const e of standing) {
      const s = sessionsByOrg.get(e.org_id);
      if (s && !orderedSessionIds.includes(s.id)) orderedSessionIds.push(s.id);
    }
    for (const st of pending) if (!orderedSessionIds.includes(st.session.id)) orderedSessionIds.push(st.session.id);
    for (const s of groupSessions) if (!orderedSessionIds.includes(s.id)) orderedSessionIds.push(s.id);

    for (const sid of orderedSessionIds) {
      const st = states.get(sid)!;
      const needByClass = { oar_set_sweep: 0, oar_set_scull: 0 };
      for (const shell of st.shells) needByClass[oarClassFor(shell.asset_class)] += 1;
      for (const o of st.oarSets) {
        if (o.asset_class === "oar_set_sweep" || o.asset_class === "oar_set_scull") {
          needByClass[o.asset_class] = Math.max(0, needByClass[o.asset_class] - 1);
        }
      }
      let noOars = 0;
      for (const oarClass of ["oar_set_sweep", "oar_set_scull"] as const) {
        while (needByClass[oarClass] > 0) {
          const candidates = sortOarSets(
            input.assets.filter((a) => isOarSetEligible(a, st.session, oarClass, ctx)),
          );
          const pick = candidates[0];
          if (!pick) {
            noOars += needByClass[oarClass];
            break;
          }
          taken.add(pick.id);
          st.oarSets.push(pick);
          needByClass[oarClass] -= 1;
          // An oar set inherits the basis of the shells it serves: standing if the
          // session holds a standing shell and no priority shell was needed, else priority.
          const basis: AllocationBasis = allocations.some(
            (x) => x.session_id === sid && x.basis === "priority",
          )
            ? "priority"
            : allocations.some((x) => x.session_id === sid && x.basis === "standing")
              ? "standing"
              : "priority";
          allocations.push({ session_id: sid, asset_id: pick.id, basis });
        }
      }

      // Step 3: status and warnings.
      const status: SessionStatus =
        st.need === 0 ? "allocated" : st.shells.length > 0 ? "partially_allocated" : "unfilled";
      sessionStatuses[sid] = status;
      const caution = [...st.shells, ...st.oarSets]
        .filter((a) => statusOn(a.id) === "caution")
        .map((a) => a.id);
      warnings[sid] = { caution, noOars };
    }
  }

  return { allocations, sessionStatuses, warnings };
}
