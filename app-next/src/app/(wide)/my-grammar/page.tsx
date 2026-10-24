/* W4.4 — server gate thật: check session ở server component, bỏ LoginGate
   client-only làm outer gate (spec 2026-10-24 Wave 4). */

import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import MyGrammarRoot from "@/components/my-grammar/my-grammar-root";

export const metadata: Metadata = { title: "Sổ tay ngữ pháp" };

export default async function MyGrammarPage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/?login=1");
  return <MyGrammarRoot />;
}
