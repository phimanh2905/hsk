"use client";

/* Card chứng chỉ coming-soon (G9, spec 11 — port clone/js/certificate-test.html).
   Bấm card → toast coming-soon (mock SP1). */

import { useToast } from "@/components/shell/toast-provider";
import type { CertificateCard } from "@/content/certificates";

export default function CertificateCardItem({ logo, name, zh, desc }: CertificateCard) {
  const toast = useToast();
  return (
    <button
      type="button"
      className="card cursor-default text-left"
      onClick={() => toast("Chứng chỉ này sắp ra mắt — hãy quay lại sau nhé!")}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-100 text-sm font-bold text-red-600">
          {logo}
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-500">{zh}</p>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-600">{desc}</p>
      <span className="mt-3 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
        Sắp ra mắt
      </span>
    </button>
  );
}
