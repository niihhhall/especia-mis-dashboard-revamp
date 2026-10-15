import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";

// Browser (Client Component) Supabase client. Uses the PUBLISHABLE key, safe to
// expose; RLS still applies via the user's session cookie (once auth lands).
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
