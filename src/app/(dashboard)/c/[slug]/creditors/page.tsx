import { AgeingReport } from "@/components/dashboard/ageing-report";
import { loadAgeingView } from "@/lib/data/ageing";

export const metadata = { title: "Creditors" };

export default async function CreditorsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AgeingReport view={await loadAgeingView("creditor", slug)} />;
}
