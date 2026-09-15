import { describe, expect, it } from "vitest";
import { OverrideError, overrideAllocation } from "./generate";
import type { Db } from "./supabase";

// Section 6.4 / acceptance test 9: the reason check happens before any database access.
const untouchable = new Proxy({} as Db, {
  get() {
    throw new Error("database must not be touched when the reason is empty");
  },
});

describe("overrideAllocation reason guard", () => {
  it("rejects an empty reason with status 400 without touching the database", async () => {
    await expect(overrideAllocation(untouchable, "alloc", "asset", "")).rejects.toMatchObject({ status: 400 });
    await expect(overrideAllocation(untouchable, "alloc", "asset", "   ")).rejects.toBeInstanceOf(OverrideError);
  });
});
