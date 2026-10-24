/* W4.4 — server gate thật: check session ở server component, bỏ LoginGate
   client-only làm outer gate (spec 2026-10-24 Wave 4). */

import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import ProgressClient from "./progress-client";

export const metadata: Metadata = { title: "Tiến độ học" };

export default async function ProgressPage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/?login=1");
  return <ProgressClient />;
}
