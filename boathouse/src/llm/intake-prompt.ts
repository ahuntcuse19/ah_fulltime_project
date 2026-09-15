// Section 7.2 prompt. The resolution rules are stated verbatim; a date lookup table
// and a seats-per-class table are supplied so the model looks values up instead of
// computing them.

import { addDays } from "@/engine/dates";
import type { IsoDate } from "@/engine/types";
import { SEATS_BY_CLASS } from "@/engine/types";

/** The five resolution rules from Section 7.2, verbatim. */
export const INTAKE_RULES: readonly string[] = [
  'Relative dates resolve against today\'s date in America/New_York. "Thursday" means the next Thursday on or after today.',
  '"early" or "first practice" → AM1; "second" or "later morning" → AM2; "afternoon" or "evening" → PM1.',
  "Seats: if a boat count is given and a headcount is not, seats = boats × seats-per-class. If both are given, use the headcount. If neither, null.",
  'Skill tier: "varsity", "1V", "racing" → competitive; "JV", "second boat" → intermediate; "novice", "learn to row", "beginners" → novice; otherwise null.',
  "confidence = low if any of date, slot, or requested_seats is null.",
];

export const OUTPUT_CONTRACT = `{
  "date": "YYYY-MM-DD" | null,
  "slot": "AM1" | "AM2" | "PM1" | null,
  "requested_seats": integer | null,
  "skill_tier": "novice" | "intermediate" | "competitive" | null,
  "confidence": "high" | "low",
  "notes": string
}`;

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** ISO weekday name for a date (1 = Monday). */
function weekdayName(date: IsoDate): string {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return WEEKDAY_NAMES[(d + 6) % 7]!;
}

/** Seven rows, today first, so every weekday word maps to exactly one date. */
export function dateLookupRows(today: IsoDate): { date: IsoDate; weekday: string; label: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i);
    const label = i === 0 ? "today" : i === 1 ? "tomorrow" : `next ${weekdayName(date)}`;
    return { date, weekday: weekdayName(date), label };
  });
}

export function seatsPerClassRows(): { word: string; asset_class: string; seats: number }[] {
  return [
    { word: "eight, 8+, eights", asset_class: "shell_8+", seats: SEATS_BY_CLASS["shell_8+"] },
    { word: "four, 4+, fours", asset_class: "shell_4+", seats: SEATS_BY_CLASS["shell_4+"] },
    { word: "double, 2x, doubles, pair", asset_class: "shell_2x", seats: SEATS_BY_CLASS["shell_2x"] },
    { word: "single, 1x, singles", asset_class: "shell_1x", seats: SEATS_BY_CLASS["shell_1x"] },
  ];
}

export function buildIntakeSystemPrompt(today: IsoDate): string {
  const dates = dateLookupRows(today)
    .map((r) => `${r.weekday} ${r.date} (${r.label})`)
    .join("\n");
  const seats = seatsPerClassRows()
    .map((r) => `${r.word}: ${r.seats} seats each`)
    .join("\n");
  return [
    "You turn one informal boathouse request into a session request. You never allocate boats.",
    "Return only a JSON object matching this contract, with no prose, no markdown and no code fence:",
    OUTPUT_CONTRACT,
    "",
    "Resolution rules:",
    ...INTAKE_RULES.map((r) => `- ${r}`),
    "",
    `Today is ${weekdayName(today)} ${today} in America/New_York. Weekday words resolve with this table (use the date exactly as written):`,
    dates,
    "",
    "Seats per class:",
    seats,
    "",
    "Notes: one short sentence naming anything you could not resolve, or an empty string. Do not use em dashes.",
  ].join("\n");
}

export function buildIntakeUserMessage(text: string): string {
  return `Request:\n${text.trim()}`;
}
