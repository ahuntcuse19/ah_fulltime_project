// Live intake eval: eight phrasings with expected fields. Needs ANTHROPIC_API_KEY.
// Usage: npx tsx scripts/eval-intake.ts [YYYY-MM-DD as "today"]

import { config } from "dotenv";
import { nextWeekdayOnOrAfter, todayNY } from "@/engine/dates";
import { parseIntake, type IntakeParsed } from "@/llm/intake-parse";

config({ path: ".env.local", override: false });
config({ override: false });

const today = process.argv[2] ?? todayNY();
const wd = (n: number) => nextWeekdayOnOrAfter(today, n);

type Expect = Partial<IntakeParsed>;
const CASES: { text: string; expect: Expect }[] = [
  { text: "hey can we get two eights thursday early, we'll have about 16, the varsity group", expect: { date: wd(4), slot: "AM1", requested_seats: 16, skill_tier: "competitive", confidence: "high" } },
  { text: "Need a four for the JV group Monday afternoon", expect: { date: wd(1), slot: "PM1", requested_seats: 4, skill_tier: "intermediate", confidence: "high" } },
  { text: "learn to row session saturday second practice, 12 people", expect: { date: wd(6), slot: "AM2", requested_seats: 12, skill_tier: "novice", confidence: "high" } },
  { text: "three doubles friday evening", expect: { date: wd(5), slot: "PM1", requested_seats: 6, skill_tier: null, confidence: "high" } },
  { text: "can the 1V take an eight and a four tomorrow first practice", expect: { slot: "AM1", requested_seats: 12, skill_tier: "competitive", confidence: "high" } },
  { text: "boats for wednesday please", expect: { date: wd(3), slot: null, requested_seats: null, confidence: "low" } },
  { text: "single for our racing sculler sunday later morning", expect: { date: wd(7), slot: "AM2", requested_seats: 1, skill_tier: "competitive", confidence: "high" } },
  { text: "beginners want 8 seats but no idea when", expect: { date: null, slot: null, requested_seats: 8, skill_tier: "novice", confidence: "low" } },
];

async function main() {
  let pass = 0;
  for (const c of CASES) {
    const r = await parseIntake(c.text, { today });
    const got = r.ok ? r.parsed : null;
    const misses = Object.entries(c.expect).filter(([k, v]) => (got as Record<string, unknown> | null)?.[k] !== v);
    const ok = r.ok && misses.length === 0;
    if (ok) pass += 1;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.text}`);
    if (!ok) console.log(`      got ${r.ok ? JSON.stringify(got) : r.reason}; expected ${JSON.stringify(c.expect)}`);
  }
  console.log(`\n${pass} of ${CASES.length} passed (today ${today})`);
  process.exit(pass === CASES.length ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
