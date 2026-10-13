"use client";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMounted } from "@/hooks/use-mounted";

const THEMES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Light, Dark or System. The choice persists and System follows the OS live. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // The chosen theme is unknown on the server: render an empty box of the
  // same size until mount so nothing shifts and nothing mismatches.
  const mounted = useMounted();
  const Current = THEMES.find((t) => t.value === theme)?.icon ?? Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Change theme">
          {mounted ? <Current className="size-4" aria-hidden="true" /> : <span className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEMES.map(({ value, label, icon: Icon }) => (
          <DropdownMenuCheckboxItem
            key={value}
            checked={mounted && theme === value}
            onCheckedChange={() => setTheme(value)}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
