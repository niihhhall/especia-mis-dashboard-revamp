"use client"; // Error boundaries must be Client Components

import { RouteError } from "@/components/route-error";

export default function CompanyError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} />;
}
