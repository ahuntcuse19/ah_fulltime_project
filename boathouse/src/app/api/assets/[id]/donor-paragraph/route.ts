import { NextResponse } from "next/server";
import { SEASON_END, SEASON_START } from "@/engine/dates";
import { createServerClient } from "@/lib/supabase";
import { boatReport, loadReportData } from "@/lib/reports";
import type { DonorInput } from "@/llm/donor-prompt";
import { generateDonorParagraph } from "@/llm/donor-paragraph";

export const dynamic = "force-dynamic";

/** 8.3.4 and 9.2: draft a donor paragraph from the boat report numbers. Nothing is stored. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = createServerClient();
  const data = await loadReportData(db);
  const asset = data.assets.find((a) => a.id === id);
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  const r = boatReport(data, asset);
  const owner = data.organizations.find((o) => o.id === asset.owner_org_id)?.name ?? "House";
  const input: DonorInput = {
    identity: {
      name: asset.name,
      asset_class: asset.asset_class,
      year_built: asset.year_built,
      age_years: r.age,
      donor_name: asset.donor_name,
      owner,
      quality_tier: asset.quality_tier,
      current_status: asset.status,
    },
    usage: {
      season: `${SEASON_START} to ${SEASON_END}`,
      session_outs: r.sessionOuts,
      available_sessions: r.availableSessions,
      utilization_pct: r.utilizationPct,
      fleet_median_utilization_pct: r.fleetMedianPct,
      session_outs_by_organization: Object.fromEntries(r.byOrg.map((x) => [x.org.name, x.session_outs])),
      session_outs_by_program: r.byProgram,
      session_outs_by_slot: r.bySlot,
    },
    health: {
      repair_spend_dollars: r.repairSpendCents / 100,
      repair_ratio_pct: r.repairRatioPct,
      days_off_water_this_season: r.daysOffWater,
      damage_events: r.events.map((e) => ({
        reported_on: e.reported_on,
        component: e.component,
        severity: e.severity,
        status: e.status,
        resolved_on: e.resolved_on,
      })),
    },
  };
  const result = await generateDonorParagraph(input);
  if (!result.ok) return NextResponse.json({ error: "Could not generate a paragraph. Try again or write one by hand." }, { status: 502 });
  return NextResponse.json({ text: result.text, words: result.words, attempts: result.attempts });
}
