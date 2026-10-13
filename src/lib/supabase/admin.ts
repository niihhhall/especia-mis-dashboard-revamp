import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

// Privileged admin client — uses the SECRET key, which BYPASSES Row Level
// Security. The `server-only` import makes importing this into client code a
// build error. Use for trusted backend writes (ingestion, publishing) only.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
