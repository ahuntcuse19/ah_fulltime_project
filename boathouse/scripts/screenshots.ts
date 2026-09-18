/**
 * Captures every screen into docs/screens/ and fails on any browser console error.
 * Usage: SCREENSHOT_BASE_URL=http://127.0.0.1:3000 npm run screenshots
 * Requires a running app and a seeded database. Playwright's bundled Chromium is used
 * unless PLAYWRIGHT_CHROMIUM_PATH points at a browser binary.
 */
import { chromium, type ConsoleMessage, type Page } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const base = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = path.join(process.cwd(), "docs", "screens");
const ASHFORD_ID = "6e70c2bc-6149-51c8-a57b-45d7ec426f0d";

const SCREENS: { file: string; path: string; act?: (page: Page) => Promise<void> }[] = [
  { file: "01-inventory.png", path: "/inventory" },
  { file: "02-boat-report.png", path: `/inventory/${ASHFORD_ID}` },
  { file: "03-week-approved.png", path: "/week?monday=2026-09-07" },
  { file: "04-week-unapproved.png", path: "/week?monday=2026-09-21" },
  { file: "05-intake.png", path: "/intake" },
  { file: "06-reports-utilization.png", path: "/reports?tab=utilization" },
  { file: "07-reports-fleet.png", path: "/reports?tab=fleet" },
  { file: "08-reports-cost.png", path: "/reports?tab=cost" },
  { file: "09-parts.png", path: "/parts" },
];

async function main() {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(`${page.url()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`${page.url()}: ${err.message}`));

  for (const s of SCREENS) {
    const res = await page.goto(base + s.path, { waitUntil: "networkidle" });
    if (!res || res.status() !== 200) throw new Error(`${s.path} returned ${res?.status()}`);
    if (s.act) await s.act(page);
    await page.screenshot({ path: path.join(outDir, s.file), fullPage: true });
    console.log(`captured ${s.file} (${s.path})`);
  }
  await browser.close();
  if (errors.length > 0) {
    console.error("Console errors:\n" + errors.join("\n"));
    process.exit(1);
  }
  console.log("No console errors.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
