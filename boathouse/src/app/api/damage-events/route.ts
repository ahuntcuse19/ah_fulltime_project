import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { DamageError, createDamageEvent, type DamageEventInput } from "@/lib/damage";

export const dynamic = "force-dynamic";

/** Section 4.6: create a damage event; asset status is re-derived on write. */
export async function POST(req: Request) {
  let body: DamageEventInput;
  try {
    body = (await req.json()) as DamageEventInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    return NextResponse.json(await createDamageEvent(createServerClient(), body), { status: 201 });
  } catch (err) {
    if (err instanceof DamageError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: err instanceof Error ? err.message : "create failed" }, { status: 500 });
  }
}
