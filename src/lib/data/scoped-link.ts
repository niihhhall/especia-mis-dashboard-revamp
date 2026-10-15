import "server-only";

import { companyPath } from "@/lib/company-scope";

/**
 * A link builder bound to the open client.
 *
 * Server Components inside `/c/[slug]` write `scoped("/upload")` rather than a
 * bare `"/upload"`, which would drop the company and land the user back on the
 * chooser.
 *
 * Takes `slug` directly rather than re-deriving it, building a URL only
 * needs the string itself, not a validated company row, so there is no
 * database round-trip here to save by keeping this a header-reading lookup
 * the way it used to be before `proxy.ts` was removed.
 */
export async function scopedLink(slug: string | null): Promise<(path: string) => string> {
  return (path: string) => (slug ? companyPath(slug, path) : path);
}
