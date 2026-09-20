import { describe, expect, it } from "vitest";
import { INTAKE_RULES, buildIntakeSystemPrompt, dateLookupRows } from "./intake-prompt";

describe("7.2 intake prompt", () => {
  it("states every resolution rule verbatim", () => {
    const prompt = buildIntakeSystemPrompt("2026-09-15");
    for (const rule of INTAKE_RULES) expect(prompt).toContain(rule);
    expect(INTAKE_RULES).toHaveLength(5);
  });

  it("supplies a seven day lookup where Thursday is the next Thursday on or after today", () => {
    const rows = dateLookupRows("2026-09-15"); // a Tuesday
    expect(rows).toHaveLength(7);
    expect(rows[0]).toMatchObject({ date: "2026-09-15", weekday: "Tuesday", label: "today" });
    expect(rows.find((r) => r.weekday === "Thursday")?.date).toBe("2026-09-17");
    expect(rows.find((r) => r.weekday === "Monday")?.date).toBe("2026-09-21");
    // Today's own weekday resolves to today, per the "on or after" rule.
    expect(dateLookupRows("2026-09-17").find((r) => r.weekday === "Thursday")?.date).toBe("2026-09-17");
  });

  it("lists seats per class and the output contract, without em dashes", () => {
    const prompt = buildIntakeSystemPrompt("2026-09-15");
    expect(prompt).toContain("eight, 8+, eights: 8 seats each");
    expect(prompt).toContain('"confidence": "high" | "low"');
    expect(prompt).not.toContain("\u2014");
  });
});
