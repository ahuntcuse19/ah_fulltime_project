// Section 3: time model. All dates are ISO YYYY-MM-DD strings in America/New_York.
// Arithmetic is done on UTC midnight so no DST shift can move a calendar date.

import type { IsoDate } from "./types";

export const SEASON_START: IsoDate = "2026-03-02"; // Monday
export const SEASON_END: IsoDate = "2026-11-01"; // Sunday
export const SEASON_WEEKS = 35;
export const SEASON_YEAR = 2026;
export const TIME_ZONE = "America/New_York";

const DAY_MS = 86_400_000;

export function parseIso(date: IsoDate): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new Error(`Bad ISO date: ${date}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function formatIso(utcMs: number): IsoDate {
  const d = new Date(utcMs);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

export function addDays(date: IsoDate, n: number): IsoDate {
  return formatIso(parseIso(date) + n * DAY_MS);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((parseIso(b) - parseIso(a)) / DAY_MS);
}

/** ISO weekday: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(date: IsoDate): number {
  const d = new Date(parseIso(date)).getUTCDay(); // 0 = Sunday
  return d === 0 ? 7 : d;
}

/** Monday of the week containing the date. */
export function mondayOf(date: IsoDate): IsoDate {
  return addDays(date, 1 - isoWeekday(date));
}

export function isInSeason(date: IsoDate): boolean {
  return date >= SEASON_START && date <= SEASON_END;
}

/** Every Monday of the season, in order. */
export function weekMondays(): IsoDate[] {
  const out: IsoDate[] = [];
  for (let i = 0; i < SEASON_WEEKS; i++) out.push(addDays(SEASON_START, i * 7));
  return out;
}

/** Inclusive list of dates from a to b. */
export function datesBetween(a: IsoDate, b: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  if (b < a) return out;
  const n = daysBetween(a, b);
  for (let i = 0; i <= n; i++) out.push(addDays(a, i));
  return out;
}

export function weekDates(monday: IsoDate): IsoDate[] {
  return datesBetween(monday, addDays(monday, 6));
}

/** Today's calendar date in America/New_York. `now` is injectable for tests. */
export function todayNY(now: Date = new Date()): IsoDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Section 3: "this week" is the Monday to Sunday week containing today,
 * clamped to the season. Outside the season it is the first week.
 */
export function thisWeekMonday(today: IsoDate): IsoDate {
  if (!isInSeason(today)) return SEASON_START;
  return mondayOf(today);
}

/** A4: metrics denominators stop at min(today, season end). */
export function metricsCutoff(today: IsoDate): IsoDate {
  return today < SEASON_END ? today : SEASON_END;
}

/** Next weekday (1..7) on or after the date. */
export function nextWeekdayOnOrAfter(date: IsoDate, weekday: number): IsoDate {
  const diff = (weekday - isoWeekday(date) + 7) % 7;
  return addDays(date, diff);
}
