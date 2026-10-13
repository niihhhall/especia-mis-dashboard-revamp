import { describe, expect, it } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("keeps a text color next to a named type step", () => {
    expect(cn("text-text-secondary", "text-label")).toBe(
      "text-text-secondary text-label",
    );
  });

  it("keeps every named type step apart from color classes", () => {
    for (const size of ["title", "card-title", "body", "label", "kpi", "base"]) {
      expect(cn("text-text-primary", `text-${size}`)).toBe(
        `text-text-primary text-${size}`,
      );
    }
  });

  it("lets the later of two type steps win", () => {
    expect(cn("text-body", "text-label")).toBe("text-label");
  });

  it("still merges conflicting utilities", () => {
    expect(cn("p-4", "p-5")).toBe("p-5");
  });
});
