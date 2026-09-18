// npm run seed: truncate every table in dependency order and reload Section 10
// with A1, A2, A6, then generate every week and approve through 10.7.
// Deterministic: two runs yield identical rows and ids. `--checksum` only prints checksums.

import { config } from "dotenv";
import { createServerClient } from "@/lib/supabase";
import { checksums, seed } from "./seed-lib";

config({ path: ".env.local", override: false });
config({ override: false });

async function main(): Promise<void> {
  const db = createServerClient();
  const onlyChecksum = process.argv.includes("--checksum");
  if (!onlyChecksum) await seed(db, (m) => console.log(m));
  const sums = await checksums(db);
  console.log("\ntable\trows\tsha256");
  for (const s of sums) console.log(`${s.table}\t${s.rows}\t${s.sha256}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
