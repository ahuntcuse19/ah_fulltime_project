// Section 7.2 and 9.1: one call, temperature 0, max 300 output tokens. Any failure
// (no key, network, refusal, invalid JSON, contract violation) becomes { ok: false } so
// the route shows exactly the 7.3 fallback message.

import { z } from "zod";
import { todayNY } from "@/engine/dates";
import type { IsoDate } from "@/engine/types";
import { callModel, type CallModel } from "./client";
import { buildIntakeSystemPrompt, buildIntakeUserMessage } from "./intake-prompt";

export const INTAKE_FALLBACK_MESSAGE = "Could not parse, fill in manually.";
export const INTAKE_TEMPERATURE = 0;
export const INTAKE_MAX_TOKENS = 300;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export const IntakeSchema = z.object({
  date: z.string().nullable(),
  slot: z.enum(["AM1", "AM2", "PM1"]).nullable(),
  requested_seats: z.number().int().nullable(),
  skill_tier: z.enum(["novice", "intermediate", "competitive"]).nullable(),
  confidence: z.enum(["high", "low"]),
  notes: z.string(),
});

export type IntakeParsed = z.infer<typeof IntakeSchema>;
export type IntakeResult = { ok: true; parsed: IntakeParsed } | { ok: false; reason: string };

/** Pull the first JSON object out of model text, tolerating a code fence. */
export function extractJson(text: string): unknown | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Validate against the 7.2 contract and recompute confidence in code (never trusted from the model). */
export function normalizeParsed(raw: unknown): IntakeParsed | null {
  const result = IntakeSchema.safeParse(raw);
  if (!result.success) return null;
  const p = result.data;
  const date = p.date !== null && ISO.test(p.date) && !Number.isNaN(Date.parse(p.date)) ? p.date : null;
  const seats = p.requested_seats !== null && p.requested_seats > 0 ? p.requested_seats : null;
  const confidence = date === null || p.slot === null || seats === null ? "low" : "high";
  return { date, slot: p.slot, requested_seats: seats, skill_tier: p.skill_tier, confidence, notes: p.notes.replace(/\u2014/g, ",") };
}

export interface ParseIntakeOptions {
  today?: IsoDate;
  call?: CallModel;
}

export async function parseIntake(text: string, opts: ParseIntakeOptions = {}): Promise<IntakeResult> {
  if (!text.trim()) return { ok: false, reason: "empty request" };
  const today = opts.today ?? todayNY();
  const call = opts.call ?? callModel;
  let reply;
  try {
    reply = await call({
      feature: "intake",
      system: buildIntakeSystemPrompt(today),
      user: buildIntakeUserMessage(text),
      temperature: INTAKE_TEMPERATURE,
      max_tokens: INTAKE_MAX_TOKENS,
    });
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "model call failed" };
  }
  if (reply.stop_reason === "max_tokens") return { ok: false, reason: "output truncated" };
  const raw = extractJson(reply.text);
  if (raw === null) return { ok: false, reason: "invalid JSON" };
  const parsed = normalizeParsed(raw);
  if (parsed === null) return { ok: false, reason: "contract violation" };
  return { ok: true, parsed };
}
