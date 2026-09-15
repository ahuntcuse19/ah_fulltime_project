import { describe, expect, it } from "vitest";
import {
  SEASON_END,
  SEASON_START,
  addDays,
  isoWeekday,
  metricsCutoff,
  mondayOf,
  nextWeekdayOnOrAfter,
  thisWeekMonday,
  todayNY,
  weekMondays,
} from "./dates";

describe("dates", () => {
  it("season is 35 Monday-start weeks from 2026-03-02 to 2026-11-01", () => {
    const mondays = weekMondays();
    expect(mondays).toHaveLength(35);
    expect(mondays[0]).toBe(SEASON_START);
    expect(addDays(mondays[34]!, 6)).toBe(SEASON_END);
    expect(isoWeekday(SEASON_START)).toBe(1);
    expect(isoWeekday(SEASON_END)).toBe(7);
  });

  it("ISO weekdays and Monday-of", () => {
    expect(isoWeekday("2026-04-07")).toBe(2); // Tuesday per acceptance test 2
    expect(isoWeekday("2026-04-08")).toBe(3);
    expect(mondayOf("2026-09-13")).toBe("2026-09-07");
    expect(mondayOf("2026-09-14")).toBe("2026-09-14");
  });

  it("this week clamps to the season", () => {
    expect(thisWeekMonday("2026-01-15")).toBe(SEASON_START);
    expect(thisWeekMonday("2026-12-01")).toBe(SEASON_START);
    expect(thisWeekMonday("2026-09-15")).toBe("2026-09-14");
  });

  it("today in America/New_York handles the UTC day boundary", () => {
    // 03:30Z on 2026-09-15 is 23:30 on 2026-09-14 in New York (EDT).
    expect(todayNY(new Date("2026-09-15T03:30:00Z"))).toBe("2026-09-14");
    expect(todayNY(new Date("2026-09-15T04:30:00Z"))).toBe("2026-09-15");
  });

  it("A4 cutoff is min(today, season end)", () => {
    expect(metricsCutoff("2026-09-15")).toBe("2026-09-15");
    expect(metricsCutoff("2026-12-25")).toBe(SEASON_END);
  });

  it("next Thursday on or after a date", () => {
    expect(nextWeekdayOnOrAfter("2026-09-15", 4)).toBe("2026-09-17");
    expect(nextWeekdayOnOrAfter("2026-09-17", 4)).toBe("2026-09-17");
    expect(nextWeekdayOnOrAfter("2026-09-18", 4)).toBe("2026-09-24");
  });
});
