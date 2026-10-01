"use client";

/* Trang form "Tạo file /create-file/[tpl]" (G7). Port renderForm + switcher
   của clone/js/create-file.js:602-680, 796-803 (data-switch giữ state).
   useReducer sở hữu state CF; persist sessionStorage mỗi render state đổi
   (khớp renderForm gọi persist()). Switcher cùng group Link — route mới
   init lại từ sessionStorage nên state không mất. */

import React, { useEffect, useReducer } from "react";
import Link from "next/link";
import { cfReducer } from "@/lib/create-file/reducer";
import { mergeCfState } from "@/lib/create-file/defaults";
import { loadCfState, persistCfState } from "@/lib/create-file/storage";
import type { CfState } from "@/lib/create-file/types";
import { estimatePages } from "@/lib/create-file/svg-render";
import { fileTemplates } from "@/content/templates";
import A4Preview from "./a4-preview";
import CreateFileForm from "./create-file-form";

function init(tplId: string): CfState {
  const s = mergeCfState(loadCfState(), tplId);
  return { ...s, tpl: tplId };
}

export default function CreateFileClient({ tplId, name, desc, group }: {
  tplId: string; name: string; desc: string; group: string;
}): React.JSX.Element {
  const [state, dispatch] = useReducer(cfReducer, undefined, () => init(tplId));

  useEffect(() => {
    persistCfState(state);
  }, [state]);

  const siblings = fileTemplates.filter((t) => t.group === group);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/create-file" className="text-sm font-bold hover:underline" style={{ color: "#c23b22" }}>
          ‹ Thư viện mẫu
        </Link>
        <h1 className="text-3xl font-extrabold">{name}</h1>
        <span data-testid="pages-badge" className="pill text-sm font-semibold">
          {estimatePages(state)} trang
        </span>
        {/* slot <PrintButton/> — Task 12 (gate mã + window.print) */}
      </div>
      <p className="text-[var(--nhai-muted)] mt-1">{desc}</p>

      <div className="grid gap-6 mt-5 lg:grid-cols-[1fr_360px] items-start">
        <A4Preview state={state} />
        <div>
          <CreateFileForm state={state} dispatch={dispatch} tplId={tplId} />
          <div className="card p-3 no-print">
            <h3 className="font-bold">Mẫu in cùng loại</h3>
            <p className="text-xs text-[var(--nhai-muted)] mb-2">Đổi mẫu không mất nội dung</p>
            <div className="flex flex-wrap gap-1.5">
              {siblings.map((t) => (
                <Link
                  key={t.id}
                  href={"/create-file/" + t.id}
                  className={"pill text-sm " + (t.id === tplId ? "pill-active" : "")}
                >
                  {t.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
