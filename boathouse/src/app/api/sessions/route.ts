import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { SessionError, createSession, type NewSessionInput } from "@/lib/sessions";

export const dynamic = "force-dynamic";

/** Section 7.3: save the intake form as a session with status requested. */
export async function POST(req: Request) {
  let body: Partial<NewSessionInput>;
  try {
    body = (await req.json()) as Partial<NewSessionInput>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const session = await createSession(createServerClient(), {
      org_id: String(body.org_id ?? ""),
      date: String(body.date ?? ""),
      slot: body.slot as NewSessionInput["slot"],
      skill_tier: (body.skill_tier ?? null) as NewSessionInput["skill_tier"],
      requested_seats: Number(body.requested_seats),
      source: body.source === "form" ? "form" : "intake",
      raw_request_text: typeof body.raw_request_text === "string" ? body.raw_request_text : null,
    });
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: err instanceof Error ? err.message : "create failed" }, { status: 500 });
  }
}
