import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { DamageError, toggleRetired } from "@/lib/damage";

export const dynamic = "force-dynamic";

/** Section 11.1: toggle retired (A9 sets or clears retired_on). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    return NextResponse.json(await toggleRetired(createServerClient(), id));
  } catch (err) {
    if (err instanceof DamageError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: err instanceof Error ? err.message : "retire failed" }, { status: 500 });
  }
}
