import { NextResponse } from "next/server";
import { isInSeason, isoWeekday } from "@/engine/dates";
import { createServerClient } from "@/lib/supabase";
import { approveWeek } from "@/lib/generate";

export const dynamic = "force-dynamic";

/** Section 6.6: approve every allocation in the week. */
export async function POST(_req: Request, ctx: { params: Promise<{ monday: string }> }) {
  const { monday } = await ctx.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(monday) || isoWeekday(monday) !== 1 || !isInSeason(monday)) {
    return NextResponse.json({ error: "monday must be a Monday inside the season, YYYY-MM-DD" }, { status: 400 });
  }
  try {
    const approved = await approveWeek(createServerClient(), monday);
    return NextResponse.json({ monday, approved });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "approve failed" }, { status: 500 });
  }
}
