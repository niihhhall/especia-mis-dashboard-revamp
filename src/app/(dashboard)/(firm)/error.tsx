"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

export default function FirmError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
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
  );
}
