import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL } from "@/lib/labels";
import type { ShellProfile } from "@/types/shell";

/**
 * Signed-in identity and sign-out, in the sidebar footer. In demo mode there
 * is no real session to end, so only the identity shows; the page banner is
 * the one demo notice.
 */
export function UserMenu({ profile, demoMode = false }: { profile: ShellProfile; demoMode?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-body font-medium text-text-primary">{profile.name ?? profile.email}</p>
        <p className="text-label text-text-secondary">{ROLE_LABEL[profile.role]}</p>
      </div>
      {demoMode ? null : (
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      )}
    </div>
  );
}
