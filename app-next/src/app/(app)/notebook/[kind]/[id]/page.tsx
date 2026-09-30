/* F5 — route /notebook/[kind]/[id]: server wrapper + LoginGate (SPEC-11 §F6).
   metadata tĩnh "Sổ tay" làm fallback; title thật do client set document.title trong effect. */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LoginGate } from "@/components/personal/login-gate";
import { notebookSubGate } from "@/content/notebooks";
import NotebookDetail from "./notebook-detail";

export const metadata: Metadata = { title: "Sổ tay" };

export default async function NotebookPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (kind !== "vocab" && kind !== "grammar") notFound();
  return (
    <LoginGate pageSub={notebookSubGate[kind]}>
      <NotebookDetail kind={kind} id={id} />
    </LoginGate>
  );
}
