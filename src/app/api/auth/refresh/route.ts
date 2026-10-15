import { isDemoMode } from "@/lib/demo/mode";
import { createClient } from "@/lib/supabase/server";

/**
 * Keeps a signed-in session's cookie fresh, replacing a job `proxy.ts` used
 * to do on every request before it was removed (Next 16 locked Proxy to the
 * Node.js runtime, which this app's Cloudflare host does not run at all).
 *
 * Why this has to exist as its own endpoint: a Server Component CANNOT write
 * cookies, `createClient()`'s cookie adapter silently no-ops there (see the
 * comment in `lib/supabase/server.ts`). So a user who only ever navigates -
 * clicking through reports, never submitting a form, could sit on an access
 * token that keeps getting silently refreshed in memory for each render
 * without the REFRESHED token ever reaching the browser's cookie. Supabase
 * refresh tokens rotate on use, so the next refresh attempt after that would
 * fail, ending the session earlier than the sign-in was meant to last.
 *
 * A Route Handler, unlike a Server Component, can write cookies, so calling
 * `getUser()` here and letting the SDK's own refresh-and-write-back run
 * genuinely persists the refreshed session. `<SessionKeepAlive>` pings this
 * on an interval from every authenticated page.
 */
export async function GET() {
  if (isDemoMode()) return Response.json({ signedIn: true, demo: true }, { headers: { "Cache-Control": "no-store" } });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No cache: this must hit the server (and its cookie-writing side effect)
  // every time, never a stale 200 served from an intermediate cache.
  return Response.json(
    { signedIn: Boolean(user) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
