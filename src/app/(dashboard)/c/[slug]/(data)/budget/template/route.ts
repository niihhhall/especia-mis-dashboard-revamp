import { AuthError, requireCompany } from "@/lib/auth/guard";
import { getFyPeriods, getCompany, getMisTemplate, getSelectedPeriod } from "@/lib/data/mis";
import { isDemoMode } from "@/lib/demo/mode";
import { getDemoBudgetMatrix } from "@/lib/demo/repository";
import { buildBudgetTemplateWorkbook } from "@/lib/export/budget-template-workbook";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /c/[slug]/budget/template, downloads the Budget template workbook.
 * Nested under the `budget/` page folder, mirrors
 * `mapping/template/route.ts` exactly, including the explicit auth check:
 * NOT covered by `(data)/layout.tsx`'s role gate, layouts only wrap
 * `page.tsx`, never a Route Handler.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let companyId: string;
  try {
    ({ companyId } = await requireCompany(["ca", "admin"], slug));
  } catch (e) {
    if (e instanceof AuthError) return new Response(e.message, { status: e.status });
    throw e;
  }

  const [company, template, current] = await Promise.all([
    getCompany(companyId),
    getMisTemplate(companyId),
    getSelectedPeriod(companyId),
  ]);

  if (!current) {
    return new Response("Upload a Trial Balance first.", { status: 400 });
  }
  const periods = await getFyPeriods(current, companyId);

  // Pre-fill with whatever's already in mis_budgets for these periods, so
  // re-downloading after a prior upload shows the CA their own prior entries
  // instead of a blank sheet.
  let existing: Record<string, Record<string, number>> = {};
  if (isDemoMode()) {
    existing = getDemoBudgetMatrix(periods.map((p) => p.id));
  } else {
    const supabase = createAdminClient();
    const { data: rows } = await supabase
      .from("mis_budgets")
      .select("period_id, key, amount")
      .in(
        "period_id",
        periods.map((p) => p.id),
      );
    for (const r of rows ?? []) {
      (existing[r.key] ??= {})[r.period_id] = Number(r.amount);
    }
  }

  const wb = buildBudgetTemplateWorkbook(
    company?.name ?? slug,
    template,
    periods.map((p) => ({ id: p.id, label: p.label })),
    existing,
  );
  const buf = await wb.xlsx.writeBuffer();

  const filename = `${slug}_budget_template.xlsx`;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
