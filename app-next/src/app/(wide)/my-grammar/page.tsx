import type { Metadata } from "next";
import { LoginGate } from "@/components/personal/login-gate";
import { NotebookList } from "@/components/notebook/notebook-list";
import { notebookSubGate } from "@/content/notebooks";
export const metadata: Metadata = { title: "Sổ tay ngữ pháp" };
export default function MyGrammarPage() {
  return (
    <LoginGate pageSub={notebookSubGate.grammar}>
      <NotebookList kind="grammar" />
    </LoginGate>
  );
}
