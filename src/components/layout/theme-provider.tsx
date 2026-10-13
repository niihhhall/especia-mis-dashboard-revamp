"use client";
import type { ComponentProps } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Client wrapper so server layouts can render the next-themes provider. */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
