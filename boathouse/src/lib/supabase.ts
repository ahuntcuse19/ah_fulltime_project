// Server-side Supabase client factory. Never imported by client components.
// Prefers the service role key (seed and server); falls back to the anon key,
// which works because RLS is off (no authentication is in scope).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Db = SupabaseClient;

export function createServerClient(): Db {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or a Supabase key in the environment");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Unwrap a PostgREST response or throw with context. */
export function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data === null) throw new Error(`${what}: no data`);
  return res.data;
}
