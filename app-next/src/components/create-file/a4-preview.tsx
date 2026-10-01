"use client";

/* Preview A4 (G7) — thuần render: map renderPages(state) → div print-page.
   renderPages trả NỘI DUNG từng trang (svg-render.sheetHtml đã bỏ wrapper),
   class sheet đặt ở đây. Port renderPreviewFor — clone create-file.js:593-600. */

import React from "react";
import { renderPages } from "@/lib/create-file/svg-render";
import type { CfState } from "@/lib/create-file/types";

export default function A4Preview({ state }: { state: CfState }): React.JSX.Element {
  return (
    <section aria-label="Xem trước bản in" data-testid="preview">
      {renderPages(state).map((page, i) => (
        <div
          key={i}
          className="print-page sheet card shadow-neo mx-auto w-full max-w-[794px] p-10 mb-8 print-area"
          dangerouslySetInnerHTML={{ __html: page }}
        />
      ))}
    </section>
  );
}
