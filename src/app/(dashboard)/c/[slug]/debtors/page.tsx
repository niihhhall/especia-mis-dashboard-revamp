import { AgeingPage } from "@/components/ageing-page";

export const metadata = { title: "Debtors" };

export default async function DebtorsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AgeingPage kind="debtor" slug={slug} />;
}
