// Section 5: eligibility. Pure predicates over plain objects.

import type { Asset, AssetClass, AssetStatus, Entitlement, Session, SkillTier } from "./types";
import { isOarSetClass, isShellClass } from "./types";
import { isAvailableStatus } from "./status";

export function skillRank(t: SkillTier): number {
  switch (t) {
    case "novice":
      return 1;
    case "intermediate":
      return 2;
    case "competitive":
      return 3;
  }
}

/** 6.5: which oar set class a shell takes. */
export function oarClassFor(shellClass: AssetClass): "oar_set_sweep" | "oar_set_scull" {
  switch (shellClass) {
    case "shell_2-":
    case "shell_4+":
    case "shell_8+":
      return "oar_set_sweep";
    case "shell_1x":
    case "shell_2x":
    case "shell_4x":
      return "oar_set_scull";
    default:
      throw new Error(`Not a shell class: ${shellClass}`);
  }
}

/** Section 5 item 3 / 4.3 rule: ownership, or shared plus any entitlement row. */
export function hasEntitlement(
  orgId: string,
  asset: Pick<Asset, "id" | "owner_org_id" | "shared">,
  entitlements: readonly Entitlement[],
): boolean {
  if (asset.owner_org_id === orgId) return true;
  if (!asset.shared) return false;
  return entitlements.some((e) => e.org_id === orgId && e.asset_id === asset.id);
}

export interface EligibilityContext {
  /** Derived status of the asset on the session date (5.1). */
  statusOn: (assetId: string) => AssetStatus;
  entitlements: readonly Entitlement[];
  /** Asset ids already allocated at this (date, slot) (5.5). */
  taken: ReadonlySet<string>;
}

/** Section 5, all five items, for shells. */
export function isShellEligible(asset: Asset, session: Session, ctx: EligibilityContext): boolean {
  if (!isShellClass(asset.asset_class)) return false; // 5.2
  if (!isAvailableStatus(ctx.statusOn(asset.id))) return false; // 5.1
  if (!hasEntitlement(session.org_id, asset, ctx.entitlements)) return false; // 5.3
  if (skillRank(session.skill_tier) < skillRank(asset.quality_tier)) return false; // 5.4
  if (ctx.taken.has(asset.id)) return false; // 5.5
  return true;
}

/** 6.5: Section 5 items 1, 3, 5 plus class match. */
export function isOarSetEligible(
  asset: Asset,
  session: Session,
  oarClass: "oar_set_sweep" | "oar_set_scull",
  ctx: EligibilityContext,
): boolean {
  if (!isOarSetClass(asset.asset_class) || asset.asset_class !== oarClass) return false;
  if (!isAvailableStatus(ctx.statusOn(asset.id))) return false; // 5.1
  if (!hasEntitlement(session.org_id, asset, ctx.entitlements)) return false; // 5.3
  if (ctx.taken.has(asset.id)) return false; // 5.5
  return true;
}
