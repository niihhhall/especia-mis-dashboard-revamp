/**
 * Where the active company comes from.
 *
 * Client-safe (no `server-only` imports) because both the sidebar in the
 * browser and the data layer on the server need to agree on the URL shape.
 *
 * The company is carried in the PATH — `/c/tirupati/dashboard` — not in a
 * cookie. A CA firm works several clients at once, and a cookie holds exactly
 * one active company per browser: two tabs would silently fight, and whichever
 * lost would render another client's figures under the right-looking heading.
 * A path segment cannot be ambiguous, survives a bookmark, and can be pasted
 * to a colleague.
 *
 * There used to be a `COMPANY_HEADER` here too: `proxy.ts` read the segment
 * and forwarded it to Server Components as a request header, so nothing had
 * to thread it through explicitly. That's gone along with proxy.ts (Next 16
 * locked it to the Node.js runtime, which this app's Cloudflare host does not
 * run) — every Server Component now reads `slug` from its own `params` and
 * passes it explicitly to `getScopedCompany(slug)` / `activeCompanyId(slug)`.
 */
const COMPANY_PREFIX = "/c/";

/** The slug in `/c/<slug>/…`, or null on an unscoped path. */
export function companySlugFromPath(pathname: string): string | null {
  if (!pathname.startsWith(COMPANY_PREFIX)) return null;
  const slug = pathname.slice(COMPANY_PREFIX.length).split("/")[0];
  return slug ? decodeURIComponent(slug) : null;
}

/** Build a company-scoped URL: `companyPath("tirupati", "/pnl")` → `/c/tirupati/pnl`. */
export function companyPath(slug: string, path: string): string {
  return `${COMPANY_PREFIX}${encodeURIComponent(slug)}${path}`;
}

/** Strip the `/c/<slug>` prefix, leaving the in-company path (`/pnl`). */
export function pathWithinCompany(pathname: string): string {
  const slug = companySlugFromPath(pathname);
  if (!slug) return pathname;
  return pathname.slice(COMPANY_PREFIX.length + encodeURIComponent(slug).length) || "/";
}

/**
 * The active company for a whole URL: the path segment first, then a
 * `?company=` fallback.
 *
 * The fallback exists for Route Handlers. `/export/xlsx` is not a page, so it
 * lives outside the `/c/[slug]` tree and has no segment to read — but the
 * workbook it streams still has to be for one specific client.
 */
export function companySlugFromUrl(url: URL): string | null {
  return companySlugFromPath(url.pathname) ?? url.searchParams.get("company") ?? null;
}
