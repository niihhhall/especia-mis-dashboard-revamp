import { describe, expect, it, vi } from "vitest";

// Vitest has no `@/` alias; point nav.ts's value import at the real module.
vi.mock("@/lib/company-scope", () => import("../company-scope"));

import { navFor } from "../nav";

/**
 * Content parity for the sidebar. The fixture below was captured from the
 * code before the premium redesign started. Labels are compared lower-cased
 * so the approved sentence case pass keeps this green; hrefs, sections and
 * order must never change.
 */
type Row = [label: string, href: string, section: "Data" | "Reports" | null];

const SLUG = "tirupati-automart";
const C = `/c/${SLUG}`;

const FIRM_ADMIN: Row[] = [
  ["companies", "/companies", null],
  ["review queue", "/review", null],
  ["mis upload", "/upload", null],
  ["users", "/users", null],
  ["audit log", "/audit", null],
  ["notes & queries", "/queries", null],
  ["reports", "/reports", null],
  ["profile", "/profile", null],
];

const FIRM_CA: Row[] = [
  ["companies", "/companies", null],
  ["review queue", "/review", null],
  ["mis upload", "/upload", null],
  ["notes & queries", "/queries", null],
  ["reports", "/reports", null],
  ["profile", "/profile", null],
];

const CLIENT_WITH_SEGMENTS: Row[] = [
  ["master data", `${C}/master-data`, "Data"],
  ["upload", `${C}/upload`, "Data"],
  ["mapping", `${C}/mapping`, "Data"],
  ["adjustments", `${C}/inputs`, "Data"],
  ["budget", `${C}/budget`, "Data"],
  ["mis template", `${C}/template`, "Data"],
  ["branches", `${C}/branches`, "Data"],
  ["dashboard", `${C}/dashboard`, "Reports"],
  ["gp dashboard", `${C}/gp-dashboard`, "Reports"],
  ["p&l detail", `${C}/pnl`, "Reports"],
  ["budget vs actual", `${C}/budget-vs-actual`, "Reports"],
  ["segment p&l", `${C}/segment`, "Reports"],
  ["book to bank", `${C}/book-to-bank`, "Reports"],
  ["cash conversion", `${C}/cash-conversion`, "Reports"],
  ["debtors", `${C}/debtors`, "Reports"],
  ["creditors", `${C}/creditors`, "Reports"],
  ["charts", `${C}/charts`, "Reports"],
  ["reports", `${C}/reports`, "Reports"],
  ["notes & queries", `${C}/queries`, "Reports"],
];

const CLIENT_WITHOUT_SEGMENTS: Row[] = [
  ["master data", `${C}/master-data`, "Data"],
  ["upload", `${C}/upload`, "Data"],
  ["mapping", `${C}/mapping`, "Data"],
  ["adjustments", `${C}/inputs`, "Data"],
  ["budget", `${C}/budget`, "Data"],
  ["mis template", `${C}/template`, "Data"],
  ["branches", `${C}/branches`, "Data"],
  ["dashboard", `${C}/dashboard`, "Reports"],
  ["gp dashboard", `${C}/gp-dashboard`, "Reports"],
  ["p&l detail", `${C}/pnl`, "Reports"],
  ["budget vs actual", `${C}/budget-vs-actual`, "Reports"],
  ["book to bank", `${C}/book-to-bank`, "Reports"],
  ["cash conversion", `${C}/cash-conversion`, "Reports"],
  ["debtors", `${C}/debtors`, "Reports"],
  ["creditors", `${C}/creditors`, "Reports"],
  ["charts", `${C}/charts`, "Reports"],
  ["reports", `${C}/reports`, "Reports"],
  ["notes & queries", `${C}/queries`, "Reports"],
];

const COMPANY_UNSCOPED: Row[] = [
  ["my dashboard", "/dashboard", null],
  ["gp dashboard", "/gp-dashboard", null],
  ["mis history", "/history", null],
  ["compare months", "/compare", null],
  ["reports", "/reports", null],
  ["notes & queries", "/queries", null],
  ["profile", "/profile", null],
];

const COMPANY_SCOPED: Row[] = [
  ["my dashboard", `${C}/dashboard`, null],
  ["gp dashboard", `${C}/gp-dashboard`, null],
  ["mis history", `${C}/history`, null],
  ["compare months", `${C}/compare`, null],
  ["reports", `${C}/reports`, null],
  ["notes & queries", `${C}/queries`, null],
  ["profile", "/profile", null],
];

const CASES: [role: "admin" | "ca" | "company", slug: string | null, hasSegments: boolean, expected: Row[]][] = [
  ["admin", null, true, FIRM_ADMIN],
  ["admin", null, false, FIRM_ADMIN],
  ["admin", SLUG, true, CLIENT_WITH_SEGMENTS],
  ["admin", SLUG, false, CLIENT_WITHOUT_SEGMENTS],
  ["ca", null, true, FIRM_CA],
  ["ca", null, false, FIRM_CA],
  ["ca", SLUG, true, CLIENT_WITH_SEGMENTS],
  ["ca", SLUG, false, CLIENT_WITHOUT_SEGMENTS],
  ["company", null, true, COMPANY_UNSCOPED],
  ["company", null, false, COMPANY_UNSCOPED],
  ["company", SLUG, true, COMPANY_SCOPED],
  ["company", SLUG, false, COMPANY_SCOPED],
];

describe("navFor content parity", () => {
  it.each(CASES)("role %s, slug %s, hasSegments %s", (role, slug, hasSegments, expected) => {
    const actual: Row[] = navFor(role, slug, hasSegments).map((i) => [
      i.label.toLowerCase(),
      i.href,
      i.section ?? null,
    ]);
    expect(actual).toEqual(expected);
  });

  it.each(CASES)("role %s, slug %s, hasSegments %s: icons are unique", (role, slug, hasSegments) => {
    const icons = navFor(role, slug, hasSegments).map((i) => i.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it("marks only Segment P&L with a nav id", () => {
    const marked = navFor("admin", SLUG, true).filter((i) => i.navId);
    expect(marked.map((i) => [i.href, i.navId])).toEqual([[`${C}/segment`, "segment"]]);
  });
});
