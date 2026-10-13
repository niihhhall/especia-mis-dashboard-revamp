import { redirect } from "next/navigation";

import { getSessionProfile } from "@/lib/auth/session";
import { companyPath } from "@/lib/company-scope";
import { defaultCompanySlug } from "@/lib/data/company-context";

export default async function Home() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  // A client has one company and wants their report. Staff start at the list of
  // clients even when they only have one: which company they are working on is
  // the first thing a CA decides, and skipping the step is how the wrong one
  // ends up open.
  if (profile.role === "company") {
    const slug = await defaultCompanySlug();
    redirect(slug ? companyPath(slug, "/dashboard") : "/profile");
  }
  redirect("/companies");
}
