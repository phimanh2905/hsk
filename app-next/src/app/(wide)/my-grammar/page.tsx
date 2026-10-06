import type { Metadata } from "next";
import { LoginGate } from "@/components/personal/login-gate";
import { notebookSubGate } from "@/content/notebooks";
import MyGrammarRoot from "@/components/my-grammar/my-grammar-root";

export const metadata: Metadata = { title: "Sổ tay ngữ pháp" };
export default function MyGrammarPage() {
  return (
    <LoginGate pageSub={notebookSubGate.grammar}>
      <MyGrammarRoot />
    </LoginGate>
  );
}
