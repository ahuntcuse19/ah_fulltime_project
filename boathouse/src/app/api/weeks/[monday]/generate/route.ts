import { NextResponse } from "next/server";
import { isInSeason, isoWeekday } from "@/engine/dates";
import { createServerClient } from "@/lib/supabase";
import { generateWeek } from "@/lib/generate";

export const dynamic = "force-dynamic";

function validMonday(monday: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(monday) && isoWeekday(monday) === 1 && isInSeason(monday);
}

/** Section 6: generate (or re-generate) one week. */
export async function POST(_req: Request, ctx: { params: Promise<{ monday: string }> }) {
  const { monday } = await ctx.params;
  if (!validMonday(monday)) {
    return NextResponse.json({ error: "monday must be a Monday inside the season, YYYY-MM-DD" }, { status: 400 });
  }
  try {
    const summary = await generateWeek(createServerClient(), monday);
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "generate failed" }, { status: 500 });
  }
}
