import type { Metadata } from "next";
import ClientAuthGate from "@/components/auth/client-auth-gate";
import MyGrammarRoot from "@/components/my-grammar/my-grammar-root";

export const metadata: Metadata = { title: "Sổ tay ngữ pháp" };

export default function MyGrammarPage() {
  return (
    <ClientAuthGate>
      <MyGrammarRoot />
    </ClientAuthGate>
  );
}
