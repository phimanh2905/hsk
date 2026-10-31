import type { Metadata } from "next";
import ClientAuthGate from "@/components/auth/client-auth-gate";
import MyVocabRoot from "@/components/my-vocab/my-vocab-root";

export const metadata: Metadata = { title: "Sổ tay từ vựng" };

export default function MyVocabPage() {
  return (
    <ClientAuthGate>
      <MyVocabRoot />
    </ClientAuthGate>
  );
}
