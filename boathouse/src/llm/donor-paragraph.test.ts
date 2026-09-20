import { describe, expect, it } from "vitest";
import type { CallModel, LlmCall } from "./client";
import { DONOR_INSTRUCTION, buildDonorSystemPrompt, buildDonorUserMessage, donorAddressee, type DonorInput } from "./donor-prompt";
import { cleanParagraph, generateDonorParagraph, wordCount } from "./donor-paragraph";

const input: DonorInput = {
  identity: { name: "The Ashford", asset_class: "shell_8+", year_built: 2016, age_years: 10, donor_name: "Margaret Ashford", owner: "House", quality_tier: "intermediate", current_status: "on_water" },
  usage: { season: "2026-03-02 to 2026-11-01", session_outs: 338, available_sessions: 594, utilization_pct: 56.9, fleet_median_utilization_pct: 7.4, session_outs_by_organization: { "Riverside University Crew": 142, "Harbor Rowing Club": 196 }, session_outs_by_program: { mens: 84, womens: 56, mixed: 198 }, session_outs_by_slot: { AM1: 196, AM2: 86, PM1: 56 } },
  health: { repair_spend_dollars: 0, repair_ratio_pct: 0, days_off_water_this_season: 0, damage_events: [] },
};

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

describe("9.2 donor paragraph", () => {
  it("states the instruction verbatim and addresses the donor or the community", () => {
    expect(buildDonorSystemPrompt()).toContain(DONOR_INSTRUCTION);
    expect(donorAddressee("Margaret Ashford")).toBe("Margaret Ashford");
    expect(donorAddressee(null)).toBe("the boathouse community");
    expect(donorAddressee("  ")).toBe("the boathouse community");
    expect(buildDonorUserMessage({ ...input, identity: { ...input.identity, donor_name: null } })).toContain("Address the paragraph to the boathouse community.");
    expect(buildDonorUserMessage(input)).toContain('"session_outs": 338');
  });

  it("removes em dashes and counts words", () => {
    expect(cleanParagraph("went out 338 times \u2014 mostly mornings")).toBe("went out 338 times, mostly mornings");
    expect(wordCount("  a  b\nc ")).toBe(3);
  });

  it("accepts a paragraph in range on the first call", async () => {
    const calls: LlmCall[] = [];
    const call: CallModel = async (c) => {
      calls.push(c);
      return { text: words(100), stop_reason: "end_turn", input_tokens: 1, output_tokens: 1 };
    };
    const r = await generateDonorParagraph(input, call);
    expect(r).toMatchObject({ ok: true, words: 100, attempts: 1 });
    expect(calls[0]?.temperature).toBe(0.3);
  });

  it("regenerates once when the length is off and keeps the better draft", async () => {
    let n = 0;
    const call: CallModel = async () => ({ text: words(n++ === 0 ? 40 : 120), stop_reason: "end_turn", input_tokens: 1, output_tokens: 1 });
    const r = await generateDonorParagraph(input, call);
    expect(r).toMatchObject({ ok: true, words: 120, attempts: 2 });
    const short: CallModel = async () => ({ text: words(40), stop_reason: "end_turn", input_tokens: 1, output_tokens: 1 });
    expect(await generateDonorParagraph(input, short)).toMatchObject({ ok: true, words: 40, attempts: 2 });
  });

  it("fails closed when the model is unavailable", async () => {
    const call: CallModel = async () => {
      throw new Error("ANTHROPIC_API_KEY is not set");
    };
    expect((await generateDonorParagraph(input, call)).ok).toBe(false);
  });
});
