import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(url && anon);

// Internal tool: demo logins talk to Supabase with the publishable key.
// RLS is permissive (see lib/supabase/schema notes) — tighten with Supabase Auth later.
export const supabase = createClient<Database>(url, anon);
