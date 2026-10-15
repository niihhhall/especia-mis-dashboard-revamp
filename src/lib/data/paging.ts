// Pure paging helper (no server-only imports) so it can be unit-tested.

function failPage(fn: string, error: { message: string; code?: string }): never {
  throw new Error(`${fn}: ${error.message}${error.code ? ` [${error.code}]` : ""}`);
}

/** One page of a PostgREST query, in the shape `fetchAllPages` needs. */
export type PageResult<T> = { data: T[] | null; error: { message: string; code?: string } | null; count: number | null };

/**
 * Reads EVERY row of a query that PostgREST would otherwise cut off at its max-rows cap (1000 by default).
 * The first page also asks for the exact row count; once that is known the remaining pages are fetched
 * IN PARALLEL instead of one after another, so a 3,000-row period costs about two round trips of latency
 * rather than four, which is what dominates on a worker that sits an ocean away from its database.
 * The caller must order the query by a unique column so the pages tile exactly.
 */
export async function fetchAllPages<T>(
  fn: string,
  page: (from: number, to: number, withCount: boolean) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const first = await page(0, PAGE_SIZE - 1, true);
  if (first.error) failPage(fn, first.error);
  const rows = first.data ?? [];
  if (rows.length < PAGE_SIZE) return rows;

  if (first.count == null) {
    // No count came back, fall back to walking the pages one by one.
    for (let from = PAGE_SIZE; ; from += PAGE_SIZE) {
      const next = await page(from, from + PAGE_SIZE - 1, false);
      if (next.error) failPage(fn, next.error);
      const data = next.data ?? [];
      rows.push(...data);
      if (data.length < PAGE_SIZE) return rows;
    }
  }

  const starts: number[] = [];
  for (let from = PAGE_SIZE; from < first.count; from += PAGE_SIZE) starts.push(from);
  const rest = await Promise.all(starts.map((from) => page(from, from + PAGE_SIZE - 1, false)));
  for (const r of rest) {
    if (r.error) failPage(fn, r.error);
    rows.push(...(r.data ?? []));
  }
  return rows;
}

