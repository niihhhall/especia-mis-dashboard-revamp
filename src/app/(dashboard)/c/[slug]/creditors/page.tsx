import { AgeingPage } from "@/components/ageing-page";

export const metadata = { title: "Creditors" };

export default async function CreditorsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AgeingPage kind="creditor" slug={slug} />;
}
