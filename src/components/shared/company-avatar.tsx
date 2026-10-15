import { cn } from "@/lib/utils";

/** Avatar initials: "Tirupati Automart Private Limited" becomes "TA". */
function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter((w) => /^[A-Za-z]/.test(w))
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?"
  );
}

/**
 * A company's identity tile: its logo when one has been uploaded
 * (`companies.logo_url`), otherwise a flat initials tile. One shared
 * component so "show the logo if there is one" is decided in exactly one
 * place (Companies grid, company header, company chooser, the grid's own
 * edit form).
 *
 * `className` carries size and text size (callers vary: size-9 to size-12);
 * the tile styling itself stays fixed here.
 */
export function CompanyAvatar({
  name,
  logoUrl,
  className = "size-10 text-card-title",
  style,
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local asset next/image can optimize.
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={cn(
          "shrink-0 rounded-full bg-surface object-contain p-1 outline outline-1 -outline-offset-1 outline-border",
          className,
        )}
        style={style}
      />
    );
  }
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-surface-raised font-semibold text-text-secondary",
        className,
      )}
      style={style}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
