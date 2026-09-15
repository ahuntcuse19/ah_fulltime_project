// Section 7.3: create a session from the intake form (or a plain form). Never allocates.

import type { Organization, Session, SkillTier, Slot } from "@/engine/types";
import { SLOTS } from "@/engine/types";
import { isInSeason } from "@/engine/dates";
import { ids } from "./ids";
import { type Db, must } from "./supabase";

export class SessionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export interface NewSessionInput {
  org_id: string;
  date: string;
  slot: Slot;
  skill_tier: SkillTier | null;
  requested_seats: number;
  source: "form" | "intake";
  raw_request_text: string | null;
}

const TIERS: SkillTier[] = ["novice", "intermediate", "competitive"];

export async function createSession(db: Db, input: NewSessionInput): Promise<Session> {
  const fail = (msg: string, status = 400) => {
    throw new SessionError(msg, status);
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) fail("date must be YYYY-MM-DD");
  if (!isInSeason(input.date)) fail("Date is outside the season");
  if (!SLOTS.includes(input.slot)) fail("slot must be AM1, AM2 or PM1");
  if (!Number.isInteger(input.requested_seats) || input.requested_seats <= 0) fail("requested_seats must be a positive integer");
  if (input.skill_tier !== null && !TIERS.includes(input.skill_tier)) fail("skill_tier is invalid");

  const org = must(await db.from("organization").select("*").eq("id", input.org_id), "organization")[0] as Organization | undefined;
  if (!org) fail("Organization not found", 404);

  const existing = must(
    await db.from("session").select("id").eq("org_id", input.org_id).eq("date", input.date).eq("slot", input.slot),
    "session",
  ) as { id: string }[];
  if (existing.length > 0) fail("A session already exists for this organization, date and slot", 409);

  const row: Session = {
    id: ids.session(input.org_id, input.date, input.slot),
    org_id: input.org_id,
    date: input.date,
    slot: input.slot,
    skill_tier: input.skill_tier ?? org!.default_skill_tier,
    requested_seats: input.requested_seats,
    source: input.source,
    raw_request_text: input.raw_request_text,
    status: "requested",
    created_at: new Date().toISOString(),
    program: null,
  };
  return must(await db.from("session").insert(row).select("*"), "insert session")[0] as Session;
}
