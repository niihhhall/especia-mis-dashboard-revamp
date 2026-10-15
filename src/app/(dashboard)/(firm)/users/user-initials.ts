/** Up to two initials from a name or email, for the avatar tile. */
export function initials(label: string): string {
  return (
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?"
  );
}

/** The 32px control size every button on the Users page uses. */
export const BTN = "h-8 rounded-md text-body";
