import { NextResponse } from "next/server";
import { createServerClient, must } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Amendment A3: the edited paragraph is stored in boat_report_note, one row per asset. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let text: string;
  try {
    const body = (await req.json()) as { text?: unknown };
    text = typeof body.text === "string" ? body.text.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: "Paragraph text is required" }, { status: 400 });
  if (text.includes("\u2014")) return NextResponse.json({ error: "Paragraph must not contain em dashes" }, { status: 400 });
  const db = createServerClient();
  const asset = must(await db.from("asset").select("id").eq("id", id), "asset");
  if (asset.length === 0) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  const updated_at = new Date().toISOString();
  must(await db.from("boat_report_note").upsert({ asset_id: id, text, updated_at }, { onConflict: "asset_id" }).select("asset_id"), "note upsert");
  return NextResponse.json({ updated_at });
}
