"use client";

/* Catalog "Tạo file" (G6 — SPEC-16 §A). Port bannerHtml + renderCatalog
   của clone/js/create-file.js:121-157 sang JSX — client vì link "Tham gia
   nhóm" cần toast (không fetch Facebook). */

import React from "react";
import Link from "next/link";
import { fileTemplates, templateGroups } from "@/content/templates";
import { useToast } from "@/components/shell/toast-provider";

export default function CatalogGrid(): React.JSX.Element {
  const toast = useToast();

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold">Tạo file</h1>
        <span className="pill zh pill-active text-sm">生成练习本</span>
      </div>
      <p className="text-[var(--nhai-muted)] mt-1">— Tạo bản in luyện viết chữ Hán theo thứ tự nét</p>

      <div className="no-print card shadow-neo p-4 mt-5 flex flex-col md:flex-row md:items-center gap-3" style={{ background: "#fdf6d8" }}>
        <div className="flex-1">
          <p className="font-bold">Cần mã tải file để in. Tham gia nhóm Facebook Nhai HSK, mã n…</p>
        </div>
        <a
          href="https://www.facebook.com/groups/nhaihsk"
          target="_blank"
          rel="noreferrer"
          className="font-bold whitespace-nowrap hover:underline"
          style={{ color: "#c23b22" }}
          onClick={() => toast("Mã tải file nằm ở phần mô tả của nhóm Facebook Nhai HSK.")}
        >
          Tham gia nhóm để lấy mã
        </a>
      </div>

      {templateGroups.map((g) => (
        <section key={g.id}>
          <h2 className="text-xl font-extrabold mt-8 mb-3">{g.label}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fileTemplates
              .filter((t) => t.group === g.id)
              .map((t) => (
                <Link
                  key={t.id}
                  href={`/create-file/${t.id}`}
                  className="card shadow-neo p-4 block hover:-translate-y-0.5 transition-transform"
                >
                  <div
                    className="rounded-md border-2 border-[#cfc4ae] bg-white mb-3 overflow-hidden aspect-[3/4]"
                  >
                    <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: t.thumb }} />
                  </div>
                  <h3 className="font-bold">{t.name}</h3>
                  <p className="text-sm text-[var(--nhai-muted)] mt-0.5">{t.desc}</p>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
