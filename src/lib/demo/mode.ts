import "server-only";

import { DEMO_WRITE_MESSAGE } from "./messages";

export { DEMO_WRITE_MESSAGE };

export function isDemoMode(): boolean {
  const configured = process.env.DEMO_MODE;
  if (configured === "true") return true;
  if (configured === "false") return false;
  if (configured !== undefined) throw new Error('Invalid DEMO_MODE. Use "true" or "false".');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  // Demo signs every visitor in as an admin, so it must never switch on by
  // accident in a deployed build. Missing config only implies demo in local dev;
  // production needs an explicit DEMO_MODE=true.
  if (!url && !key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Supabase configuration is missing. Provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or set DEMO_MODE=true explicitly.");
    }
    return true;
  }
  if (!url || !key) {
    throw new Error("Supabase configuration is incomplete. Set DEMO_MODE=true for the read-only demo, or provide both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  return false;
}

/** First statement of every Server Action: in demo, reply without saving. */
export function demoWriteBlocked(): { ok: false; message: string } | null {
  return isDemoMode() ? { ok: false, message: DEMO_WRITE_MESSAGE } : null;
}

/** Backstop for library writers: a write that slips past an action guard fails loudly in demo. */
export function assertWritable(fn: string): void {
  if (isDemoMode()) throw new Error(`${fn}: ${DEMO_WRITE_MESSAGE}`);
}
