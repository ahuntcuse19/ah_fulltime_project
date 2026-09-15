// Section 4.6: status derivation, in two flavours.
//  - deriveStoredStatus: the value written to asset.status on every damage event write
//    (looks at event status only, per 4.6).
//  - deriveStatusAsOf: the value as of a calendar date, used by eligibility (5.1)
//    and metrics (8.1), using reported_on and resolved_on.

import type { Asset, AssetStatus, DamageEvent, IsoDate } from "./types";

/**
 * An event is active on date D when it was reported on or before D and,
 * if fixed, D is on or before resolved_on (inclusive both ends: acceptance
 * test 5 counts 2026-04-02 to 2026-04-16 as 15 days off water).
 * Open or parts_ordered events stay active from reported_on onward.
 */
export function isEventActiveOn(e: DamageEvent, date: IsoDate): boolean {
  if (e.reported_on > date) return false;
  if (e.status === "fixed") return e.resolved_on !== null && date <= e.resolved_on;
  return true;
}

function severityStatus(active: DamageEvent[]): AssetStatus {
  if (active.some((e) => e.severity === "off_water")) return "off_water";
  if (active.some((e) => e.severity === "caution")) return "caution";
  return "on_water";
}

export function isRetiredOn(asset: Pick<Asset, "status" | "retired_on">, date: IsoDate): boolean {
  if (asset.status !== "retired") return false;
  return asset.retired_on === null || date >= asset.retired_on;
}

/** Status as of a calendar date. `events` may include other assets' events. */
export function deriveStatusAsOf(
  asset: Pick<Asset, "id" | "status" | "retired_on">,
  events: readonly DamageEvent[],
  date: IsoDate,
): AssetStatus {
  if (isRetiredOn(asset, date)) return "retired";
  const active = events.filter((e) => e.asset_id === asset.id && isEventActiveOn(e, date));
  return severityStatus(active);
}

/** Stored value per 4.6: only open or parts_ordered events count, dates ignored. */
export function deriveStoredStatus(
  asset: Pick<Asset, "id" | "status">,
  events: readonly DamageEvent[],
): AssetStatus {
  if (asset.status === "retired") return "retired";
  const active = events.filter(
    (e) => e.asset_id === asset.id && (e.status === "open" || e.status === "parts_ordered"),
  );
  return severityStatus(active);
}

export function isAvailableStatus(s: AssetStatus): boolean {
  return s === "on_water" || s === "caution";
}
