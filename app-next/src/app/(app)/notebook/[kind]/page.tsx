/* F5 — route /notebook/[kind]: SSG tĩnh (vocab | grammar), id đọc từ query
   ?id= trong NotebookDetail (useSearchParams). Deep-link /notebook/<kind>/<id>
   cũ xử lý qua _redirects. metadata tĩnh "Sổ tay" làm fallback; title thật do
   client set document.title trong effect. */

import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginGate } from "@/components/personal/login-gate";
import { notebookSubGate } from "@/content/notebooks";
import NotebookDetail from "./notebook-detail";

export const dynamicParams = false;

export const metadata: Metadata = { title: "Sổ tay" };

export function generateStaticParams(): { kind: string }[] {
  return [{ kind: "vocab" }, { kind: "grammar" }];
}

export default async function NotebookPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const k = kind === "grammar" ? "grammar" : "vocab";
  return (
    <Suspense fallback={null}>
      <LoginGate pageSub={notebookSubGate[k]}>
        <NotebookDetail kind={k} />
      </LoginGate>
    </Suspense>
  );
}
