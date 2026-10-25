"use client";

/* Card chứng chỉ (G9, spec 11 — port clone/js/certificate-test.html).
   Có `href` (ví dụ HSK 1 đã có đề demo) → render Link "Làm bài thi demo";
   không có → giữ button + toast coming-soon (mock SP1). */

import Link from "next/link";
import { useToast } from "@/components/shell/toast-provider";
import type { CertificateCard } from "@/content/certificates";

export default function CertificateCardItem({
  logo,
  name,
  zh,
  desc,
  href,
}: CertificateCard & { href?: string }) {
  const toast = useToast();
  const inner = (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-border-default bg-surface-paper text-sm font-bold">
          {logo}
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-bold">{name}</h3>
          <p className="text-sm text-text-secondary">{zh}</p>
        </div>
      </div>
      <p className="mt-2 text-sm text-text-secondary">{desc}</p>
      <span className="mt-3 inline-block rounded-control border border-border-default bg-surface-paper px-2 py-0.5 text-xs font-semibold text-text-secondary">
        {href ? "Làm bài thi demo" : "Sắp ra mắt"}
      </span>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-card border border-border-default bg-surface-elevated shadow-xs p-6 text-left text-text-primary focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className="rounded-card border border-border-default bg-surface-elevated shadow-xs p-6 text-left cursor-default text-text-primary focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
      onClick={() => toast("Chứng chỉ này sắp ra mắt — hãy quay lại sau nhé!")}
    >
      {inner}
    </button>
  );
}
