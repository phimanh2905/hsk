/* Trang theo user (server gate W4) — KHÔNG prerender tĩnh: getAuth dùng
   getCloudflareContext sync chỉ hợp lệ trong request context. */
export const dynamic = "force-dynamic";

/* W4.4 — server gate thật: check session ở server component, bỏ LoginGate
   client-only làm outer gate (spec 2026-10-24 Wave 4). */

import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import MyVocabRoot from "@/components/my-vocab/my-vocab-root";

export const metadata: Metadata = { title: "Sổ tay từ vựng" };

export default async function MyVocabPage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/?login=1");
  return <MyVocabRoot />;
}
