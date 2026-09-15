import { describe, expect, it } from "vitest";
import type { CallModel } from "./client";
import { INTAKE_FALLBACK_MESSAGE, extractJson, normalizeParsed, parseIntake } from "./intake-parse";

const reply = (text: string, stop_reason = "end_turn"): CallModel => async () => ({ text, stop_reason, input_tokens: 1, output_tokens: 1 });

const good = { date: "2026-09-17", slot: "AM1", requested_seats: 16, skill_tier: "competitive", confidence: "high", notes: "" };

describe("7.2 contract validation", () => {
  it("extracts JSON from plain text and from a code fence", () => {
    expect(extractJson(JSON.stringify(good))).toEqual(good);
    expect(extractJson("```json\n" + JSON.stringify(good) + "\n```")).toEqual(good);
    expect(extractJson("no json here")).toBeNull();
    expect(extractJson("{ not: valid }")).toBeNull();
  });

  it("recomputes confidence from nulls instead of trusting the model", () => {
    expect(normalizeParsed({ ...good, confidence: "low" })?.confidence).toBe("high");
    expect(normalizeParsed({ ...good, slot: null, confidence: "high" })?.confidence).toBe("low");
    expect(normalizeParsed({ ...good, requested_seats: null })?.confidence).toBe("low");
  });

  it("rejects bad enums and nulls a malformed date", () => {
    expect(normalizeParsed({ ...good, slot: "AM3" })).toBeNull();
    expect(normalizeParsed({ ...good, skill_tier: "elite" })).toBeNull();
    expect(normalizeParsed({ ...good, requested_seats: 8.5 })).toBeNull();
    const bad = normalizeParsed({ ...good, date: "next thursday" });
    expect(bad?.date).toBeNull();
    expect(bad?.confidence).toBe("low");
  });
});

describe("7.3 fallback behaviour", () => {
  const opts = { today: "2026-09-15" };
  it("returns the parsed fields on a valid reply", async () => {
    const r = await parseIntake("two eights thursday early", { ...opts, call: reply(JSON.stringify(good)) });
    expect(r).toEqual({ ok: true, parsed: good });
  });
  it("fails closed on invalid JSON, contract violations, truncation and thrown errors", async () => {
    expect((await parseIntake("x", { ...opts, call: reply("Sure! Here you go.") })).ok).toBe(false);
    expect((await parseIntake("x", { ...opts, call: reply(JSON.stringify({ ...good, slot: "noon" })) })).ok).toBe(false);
    expect((await parseIntake("x", { ...opts, call: reply(JSON.stringify(good), "max_tokens") })).ok).toBe(false);
    const throwing: CallModel = async () => {
      throw new Error("network down");
    };
    expect((await parseIntake("x", { ...opts, call: throwing })).ok).toBe(false);
    expect((await parseIntake("   ", opts)).ok).toBe(false);
  });
  it("uses the exact 7.3 message", () => {
    expect(INTAKE_FALLBACK_MESSAGE).toBe("Could not parse, fill in manually.");
  });
});
