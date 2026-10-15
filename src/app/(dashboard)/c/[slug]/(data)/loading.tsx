import { PageSkeleton } from "@/components/shared/page-skeleton";

/** The data-entry screens stream in behind a form skeleton, not the report one. */
export default function Loading() {
  return <PageSkeleton variant="form" />;
}
