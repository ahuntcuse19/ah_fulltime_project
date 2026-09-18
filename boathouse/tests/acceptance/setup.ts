import { config } from "dotenv";

// The acceptance suite runs against the seeded database. Env comes from .env.local
// (local runs) or the process environment (CI, Vercel).
config({ path: ".env.local", override: false });
config({ override: false });
