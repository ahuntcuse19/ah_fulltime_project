import { NextResponse } from "next/server";
import { INTAKE_FALLBACK_MESSAGE, parseIntake } from "@/llm/intake-parse";

export const dynamic = "force-dynamic";

/**
 * Section 7: parse only, never allocates and never writes. The org comes from the
 * dropdown and is not sent to the model. Any failure returns the 7.3 message.
 */
export async function POST(req: Request) {
  let text = "";
  try {
    const body = (await req.json()) as { text?: unknown };
    text = typeof body.text === "string" ? body.text : "";
  } catch {
    return NextResponse.json({ ok: false, message: INTAKE_FALLBACK_MESSAGE }, { status: 400 });
  }
  if (!text.trim()) return NextResponse.json({ ok: false, message: INTAKE_FALLBACK_MESSAGE }, { status: 400 });
  const result = await parseIntake(text);
  if (!result.ok) {
    console.log(JSON.stringify({ intake: "fallback", reason: result.reason }));
    return NextResponse.json({ ok: false, message: INTAKE_FALLBACK_MESSAGE }, { status: 200 });
  }
  return NextResponse.json({ ok: true, parsed: result.parsed });
}
