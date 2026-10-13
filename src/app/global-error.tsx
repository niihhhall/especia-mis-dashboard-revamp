"use client"; // Error boundaries must be Client Components

import "./globals.css";

import { RouteError } from "@/components/route-error";
import { ThemeProvider } from "@/components/layout/theme-provider";

/**
 * Replaces the root layout when it (or anything above a segment's own
 * error.tsx) throws, so it brings its own <html>, <body>, styles and title —
 * metadata exports aren't supported here.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="min-h-full px-4">
        <title>Something went wrong · Especia MIS</title>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <main>
            <RouteError error={error} retry={retry} />
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
