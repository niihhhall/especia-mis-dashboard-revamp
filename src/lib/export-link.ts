/**
 * The company travels in the query string because `/export/xlsx` is a route
 * handler, which sits outside the `/c/[slug]` tree and so never sees the path
 * segment the rest of the app scopes by.
 */
export function excelHref(slug: string): string {
  return `/export/xlsx?company=${encodeURIComponent(slug)}`;
}
