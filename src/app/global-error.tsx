"use client"; // Error boundaries must be Client Components

import "./globals.css";

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";
import { useEffect } from "react";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

/**
 * Replaces the root layout when it (or anything above a segment's own
 * error.tsx) throws, so it brings its own <html>, <body>, fonts, styles and
 * title: metadata exports aren't supported here.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} h-full`}>
      <body className="min-h-full px-4">
        <title>Something went wrong · Especia MIS</title>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <main>
            <ErrorState
              as="h1"
              reference={error.digest}
              onRetry={retry}
              action={
                <Button asChild variant="outline" size="sm" className="text-body">
                  <Link href="/companies">Back to companies</Link>
                </Button>
              }
            />
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
