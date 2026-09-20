import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { DamageError, updateDamageEvent, type DamageEventInput } from "@/lib/damage";

export const dynamic = "force-dynamic";

/** Section 4.6 and 4.8: edit a damage event; parts decrement when it moves to fixed. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: Partial<DamageEventInput>;
  try {
    body = (await req.json()) as Partial<DamageEventInput>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    return NextResponse.json(await updateDamageEvent(createServerClient(), id, body));
  } catch (err) {
    if (err instanceof DamageError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: err instanceof Error ? err.message : "update failed" }, { status: 500 });
  }
}
