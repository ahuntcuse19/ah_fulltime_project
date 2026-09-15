import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { OverrideError, overrideAllocation } from "@/lib/generate";

export const dynamic = "force-dynamic";

/** Section 6.4: manual override. Body: { asset_id: string, reason: string }. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: { asset_id?: unknown; reason?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const assetId = typeof body.asset_id === "string" ? body.asset_id : "";
  const reason = typeof body.reason === "string" ? body.reason : "";
  if (!assetId) return NextResponse.json({ error: "asset_id is required" }, { status: 400 });
  try {
    const updated = await overrideAllocation(createServerClient(), id, assetId, reason);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof OverrideError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: err instanceof Error ? err.message : "override failed" }, { status: 500 });
  }
}
