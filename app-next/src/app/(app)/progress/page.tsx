import type { Metadata } from "next";
import ClientAuthGate from "@/components/auth/client-auth-gate";
import ProgressClient from "./progress-client";

export const metadata: Metadata = { title: "Tiến độ học" };

export default function ProgressPage() {
  return (
    <ClientAuthGate>
      <ProgressClient />
    </ClientAuthGate>
  );
}
