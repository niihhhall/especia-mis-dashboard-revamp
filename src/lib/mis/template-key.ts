/**
 * camelCase template-line `key` derived from a grouping's display name, for
 * a template line auto-created from the Mapping page's Section picker (see
 * `saveMapping`). Mirrors the style of every hand-typed key already in this
 * codebase (`jobworkExpense`, `freightInward`, ...).
 */
export function keyFromGrouping(grouping: string): string {
  const words = grouping
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "line";
  return words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join("");
}
