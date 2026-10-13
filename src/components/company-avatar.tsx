/** Avatar initials — "Tirupati Automart Private Limited" → "TA". */
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
 * A company's identity tile — its logo when one has been uploaded
 * (`companies.logo_url`), falling back to the gradient initials tile every
 * company had before logos existed. One shared component so "show the logo
 * if there is one" is decided in exactly one place, not re-implemented at
 * each of the four spots (Companies grid, company header, company chooser,
 * the grid's own edit form) that used to each carry their own copy of the
 * initials-only version.
 *
 * `className` carries size/rounding/text-size (callers vary: size-9 to
 * size-12) since those differ per call site; the gradient/logo-frame styling
 * itself stays fixed here.
 */
export function CompanyAvatar({
  name,
  logoUrl,
  className = "size-10 text-sm",
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
        className={`shrink-0 rounded-xl border border-border bg-white object-contain p-1 ${className}`}
        style={style}
      />
    );
  }
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl font-bold text-white ${className}`}
      style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))", ...style }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
