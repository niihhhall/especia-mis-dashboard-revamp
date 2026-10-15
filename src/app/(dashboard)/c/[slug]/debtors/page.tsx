import { AgeingReport } from "@/components/dashboard/ageing-report";
import { loadAgeingView } from "@/lib/data/ageing";

export const metadata = { title: "Debtors" };

export default async function DebtorsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AgeingReport view={await loadAgeingView("debtor", slug)} />;
}
