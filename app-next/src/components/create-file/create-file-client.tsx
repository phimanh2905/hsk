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
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import PrintButton from "./print-button";
import A4Preview from "./a4-preview";
import CreateFileForm from "./create-file-form";

function init(tplId: string): CfState {
  const s = mergeCfState(loadCfState(), tplId);
  return { ...s, tpl: tplId };
}

const chipLinkBase =
  "inline-flex items-center gap-1.5 min-h-11 rounded-control border px-3 text-sm font-medium no-underline " +
  "focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2";

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
        <Link href="/create-file" className="text-sm font-semibold text-text-secondary hover:text-action-primary hover:underline">
          ‹ Thư viện mẫu
        </Link>
        <h1 className="text-3xl font-extrabold">{name}</h1>
        <Chip data-testid="pages-badge">{estimatePages(state)} trang</Chip>
        <PrintButton />
      </div>
      <p className="text-text-secondary mt-1">{desc}</p>

      <div className="grid gap-6 mt-5 lg:grid-cols-[1fr_360px] items-start">
        <A4Preview state={state} />
        <div>
          <CreateFileForm state={state} dispatch={dispatch} tplId={tplId} />
          <Card className="p-4 no-print">
            <h3 className="font-bold">Mẫu in cùng loại</h3>
            <p className="text-xs text-text-secondary mb-2">Đổi mẫu không mất nội dung</p>
            <div className="flex flex-wrap gap-1.5">
              {siblings.map((t) => (
                <Link
                  key={t.id}
                  href={"/create-file/" + t.id}
                  aria-current={t.id === tplId ? "page" : undefined}
                  className={
                    chipLinkBase + " " +
                    (t.id === tplId
                      ? "bg-action-primary text-white border-transparent"
                      : "bg-surface-elevated text-text-primary border-border-default hover:border-action-primary hover:text-action-primary")
                  }
                >
                  {t.name}
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
