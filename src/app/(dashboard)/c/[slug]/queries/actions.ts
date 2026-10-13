"use server";

import { revalidatePath } from "next/cache";

import { createQuery, replyToQuery } from "@/lib/data/queries";
import { getSelectedPeriod } from "@/lib/data/mis";
import { requireUser } from "@/lib/auth/guard";
import { actionFailed, TRY_AGAIN } from "@/lib/action-error";
import { demoWriteBlocked } from "@/lib/demo/mode";

export interface QueryState {
  ok: boolean;
  message: string;
}

export async function postQuery(_prev: QueryState, formData: FormData): Promise<QueryState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, message: "Write your question first." };

  try {
    // Only a company-role user ever sees the form this calls (see
    // queries/page.tsx), so their own profile already names the company —
    // no need to thread the URL's slug through a Server Action for this one.
    const profile = await requireUser();
    // Attach to the month currently in view, so the CA has context.
    const period = await getSelectedPeriod(profile.companyId ?? undefined);
    await createQuery(body, period?.id ?? null);
    revalidatePath("/queries");
    return { ok: true, message: "Sent to your CA." };
  } catch (e) {
    return actionFailed("postQuery", e, `Question not sent. ${TRY_AGAIN}`);
  }
}

export async function postReply(_prev: QueryState, formData: FormData): Promise<QueryState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  const queryId = String(formData.get("queryId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!queryId || !body) return { ok: false, message: "Write a reply first." };

  try {
    await replyToQuery(queryId, body);
    revalidatePath("/queries");
    return { ok: true, message: "Reply posted." };
  } catch (e) {
    return actionFailed("postReply", e, `Reply not sent. ${TRY_AGAIN}`);
  }
}
