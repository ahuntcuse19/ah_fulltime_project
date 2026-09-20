// SPEC.md Section 13 test 8: the 7.1 example, run on a date where the next Thursday is in
// season, yields slot AM1, requested_seats 16, skill_tier competitive, confidence high.
// Runs the live model through the deployed route when ACCEPTANCE_BASE_URL is set,
// otherwise through parseIntake with ANTHROPIC_API_KEY. Skips (never passes) without either.

import { describe, expect, it } from "vitest";
import { isInSeason, nextWeekdayOnOrAfter, todayNY } from "@/engine/dates";
import { parseIntake, type IntakeParsed } from "@/llm/intake-parse";

const EXAMPLE = "hey can we get two eights thursday early, we'll have about 16, the varsity group";
const base = process.env.ACCEPTANCE_BASE_URL;
const canRun = Boolean(base || process.env.ANTHROPIC_API_KEY);

describe("acceptance test 8: intake example", () => {
  it.skipIf(!canRun)("parses the 7.1 example", async () => {
    const today = todayNY();
    const thursday = nextWeekdayOnOrAfter(today, 4);
    if (!isInSeason(thursday)) {
      console.log(`test 8 needs the next Thursday in season; today is ${today}`);
      return;
    }
    let parsed: IntakeParsed;
    if (base) {
      const res = await fetch(`${base}/api/intake/parse`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: EXAMPLE }),
      });
      const body = (await res.json()) as { ok: boolean; parsed?: IntakeParsed; message?: string };
      expect(body.ok, body.message).toBe(true);
      parsed = body.parsed!;
    } else {
      const r = await parseIntake(EXAMPLE);
      expect(r.ok, r.ok ? "" : r.reason).toBe(true);
      parsed = (r as { ok: true; parsed: IntakeParsed }).parsed;
    }
    expect(parsed.date).toBe(thursday);
    expect(parsed.slot).toBe("AM1");
    expect(parsed.requested_seats).toBe(16);
    expect(parsed.skill_tier).toBe("competitive");
    expect(parsed.confidence).toBe("high");
  });
});
