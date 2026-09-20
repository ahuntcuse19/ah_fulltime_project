// Section 9.2: temperature 0.3, plain text. Post-checks in code: 90 to 130 words and
// no em dash. One regeneration when the length is off; em dashes are always replaced.

import { callModel, type CallModel } from "./client";
import { buildDonorSystemPrompt, buildDonorUserMessage, type DonorInput } from "./donor-prompt";

export const DONOR_TEMPERATURE = 0.3;
export const DONOR_MAX_TOKENS = 400;
export const DONOR_MIN_WORDS = 90;
export const DONOR_MAX_WORDS = 130;

export type DonorResult = { ok: true; text: string; words: number; attempts: number } | { ok: false; reason: string };

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Collapse to one paragraph and remove every em dash. */
export function cleanParagraph(text: string): string {
  return text
    .replace(/\s*\u2014\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

export function lengthOk(text: string): boolean {
  const n = wordCount(text);
  return n >= DONOR_MIN_WORDS && n <= DONOR_MAX_WORDS;
}

export async function generateDonorParagraph(input: DonorInput, call: CallModel = callModel): Promise<DonorResult> {
  const system = buildDonorSystemPrompt();
  let best: string | null = null;
  let attempts = 0;
  for (const retryNote of [undefined, `Your previous draft was the wrong length. Write between ${DONOR_MIN_WORDS} and ${DONOR_MAX_WORDS} words.`]) {
    attempts += 1;
    let text: string;
    try {
      const reply = await call({
        feature: "donor",
        system,
        user: buildDonorUserMessage(input, retryNote),
        temperature: DONOR_TEMPERATURE,
        max_tokens: DONOR_MAX_TOKENS,
      });
      text = cleanParagraph(reply.text);
    } catch (err) {
      if (best !== null) break;
      return { ok: false, reason: err instanceof Error ? err.message : "model call failed" };
    }
    if (!text) {
      if (best !== null) break;
      return { ok: false, reason: "empty paragraph" };
    }
    best ??= text;
    if (lengthOk(text)) {
      best = text;
      break;
    }
  }
  if (best === null) return { ok: false, reason: "no paragraph" };
  return { ok: true, text: best, words: wordCount(best), attempts };
}
