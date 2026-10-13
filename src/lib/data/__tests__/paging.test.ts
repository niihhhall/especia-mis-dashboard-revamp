import { describe, expect, it } from "vitest";

import { fetchAllPages, type PageResult } from "../paging";

/** A fake table of `n` rows; `calls` records every page requested, in order. */
function table(n: number, opts: { count?: boolean; failAt?: number } = {}) {
  const calls: { from: number; to: number; withCount: boolean }[] = [];
  const page = async (from: number, to: number, withCount: boolean): Promise<PageResult<number>> => {
    calls.push({ from, to, withCount });
    if (opts.failAt === from) return { data: null, error: { message: "boom", code: "X" }, count: null };
    const data = Array.from({ length: Math.max(0, Math.min(to + 1, n) - from) }, (_, i) => from + i);
    return { data, error: null, count: withCount && opts.count !== false ? n : null };
  };
  return { page, calls };
}

describe("fetchAllPages", () => {
  it("returns a short table in one request", async () => {
    const t = table(250);
    expect(await fetchAllPages("t", t.page)).toHaveLength(250);
    expect(t.calls).toHaveLength(1);
  });

  it("reads a multi-page table completely and in order, fetching later pages after one count request", async () => {
    const t = table(3346);
    const rows = await fetchAllPages("t", t.page);
    expect(rows).toHaveLength(3346);
    expect(rows).toEqual(Array.from({ length: 3346 }, (_, i) => i));
    expect(t.calls.filter((c) => c.withCount)).toHaveLength(1); // only the first page asks for the count
    expect(t.calls.map((c) => c.from).sort((a, b) => a - b)).toEqual([0, 1000, 2000, 3000]);
  });

  it("handles an exact multiple of the page size without dropping or duplicating rows", async () => {
    const t = table(2000);
    const rows = await fetchAllPages("t", t.page);
    expect(rows).toHaveLength(2000);
    expect(new Set(rows).size).toBe(2000);
  });

  it("falls back to walking pages one by one when no count comes back", async () => {
    const t = table(2500, { count: false });
    const rows = await fetchAllPages("t", t.page);
    expect(rows).toHaveLength(2500);
    expect(t.calls.map((c) => c.from)).toEqual([0, 1000, 2000]);
  });

  it("raises the database error instead of returning partial data", async () => {
    await expect(fetchAllPages("loader", table(3000, { failAt: 2000 }).page)).rejects.toThrow(/loader: boom \[X\]/);
  });
});
