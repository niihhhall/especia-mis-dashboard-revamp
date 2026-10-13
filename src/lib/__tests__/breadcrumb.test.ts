import { describe, expect, it, vi } from "vitest";

// Vitest has no `@/` alias; point nav.ts's value import at the real module.
vi.mock("@/lib/company-scope", () => import("../company-scope"));

import { breadcrumbFor } from "../breadcrumb";
import { navFor } from "../nav";

const SLUG = "tirupati-automart";
const COMPANY = { slug: SLUG, name: "Tirupati Automart Pvt Ltd" };

describe("breadcrumbFor", () => {
  it("names the product and the nav label on a firm page", () => {
    const items = navFor("admin", null);
    expect(breadcrumbFor("/companies", items, null)).toEqual([
      { label: "Especia MIS", href: "/companies" },
      { label: "Companies" },
    ]);
  });

  it("matches nested firm routes to their nav item", () => {
    const items = navFor("admin", null);
    expect(breadcrumbFor("/users/123", items, null)[1]).toEqual({ label: "Users" });
  });

  it("names the company and the nav label on a company page", () => {
    const items = navFor("admin", SLUG);
    expect(breadcrumbFor(`/c/${SLUG}/pnl`, items, COMPANY)).toEqual([
      { label: COMPANY.name, href: `/c/${SLUG}/dashboard` },
      { label: "P&L Detail" },
    ]);
  });

  it("shows crumb 1 only for a path with no nav match", () => {
    const items = navFor("admin", null);
    expect(breadcrumbFor("/", items, null)).toEqual([{ label: "Especia MIS", href: "/companies" }]);
    const scoped = navFor("admin", SLUG);
    expect(breadcrumbFor(`/c/${SLUG}`, scoped, COMPANY)).toEqual([
      { label: COMPANY.name, href: `/c/${SLUG}/dashboard` },
    ]);
  });

  it("falls back to the slug for a company missing from the directory", () => {
    const items = navFor("ca", "old-co");
    expect(breadcrumbFor("/c/old-co/dashboard", items, null)).toEqual([
      { label: "old-co", href: "/c/old-co/dashboard" },
      { label: "Dashboard" },
    ]);
    expect(breadcrumbFor("/c/old-co/dashboard", items, COMPANY)[0].label).toBe("old-co");
  });
});
