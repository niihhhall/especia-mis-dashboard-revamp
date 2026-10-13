import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Structural guard: every exported Server Action must short-circuit in demo
// mode as its very first statement, so a new action cannot reach auth,
// storage, the database or the audit log while DEMO_MODE is on.

const APP_DIR = fileURLToPath(new URL("../../../app", import.meta.url));

function actionFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return actionFiles(path);
    return entry.name === "actions.ts" ? [path] : [];
  });
}

/** Index just past the `{` that opens the function body starting at `from` (the `(` of the params). */
function bodyStart(source: string, from: number): number {
  let parens = 0;
  let i = from;
  for (; i < source.length; i++) {
    if (source[i] === "(") parens++;
    else if (source[i] === ")" && --parens === 0) break;
  }
  // Skip the return-type annotation; braces inside `<...>` belong to the type.
  let angles = 0;
  for (i++; i < source.length; i++) {
    const ch = source[i];
    if (ch === "<") angles++;
    else if (ch === ">" && source[i - 1] !== "=") angles--;
    else if (ch === "{" && angles === 0) return i + 1;
  }
  throw new Error("function body not found");
}

/** First non-empty, non-comment line of the body. */
function firstStatement(source: string, start: number): string {
  let rest = source.slice(start);
  for (;;) {
    rest = rest.trimStart();
    if (rest.startsWith("//")) rest = rest.slice(rest.indexOf("\n") + 1);
    else if (rest.startsWith("/*")) rest = rest.slice(rest.indexOf("*/") + 2);
    else break;
  }
  return rest.split(/\r?\n/, 1)[0] ?? "";
}

const actions = actionFiles(APP_DIR).flatMap((file) => {
  const source = readFileSync(file, "utf8");
  return [...source.matchAll(/^export async function (\w+)\(/gm)].map((m) => ({
    name: `${relative(APP_DIR, file)}#${m[1]}`,
    first: firstStatement(source, bodyStart(source, (m.index ?? 0) + m[0].length - 1)),
  }));
});

describe("demo write guard", () => {
  it("finds every Server Action", () => {
    expect(actions.length).toBeGreaterThanOrEqual(41);
  });

  it.each(actions)("$name short-circuits in demo mode first", ({ first }) => {
    expect(first).toMatch(/demoWriteBlocked|isDemoMode/);
  });
});
