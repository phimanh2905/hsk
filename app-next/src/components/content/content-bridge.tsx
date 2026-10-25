"use client";

import { useEffect } from "react";
import { loadVocab } from "@/lib/content/vocab-client";
import { setVocabData } from "@/lib/srs-session";

/* Nạp vocab 1 lần mỗi phiên và inject vào srs-session (resolve SRS key dạng
   book.page.idx cần full dataset, client không đọc được D1 trực tiếp).
   API lỗi → srs-session vẫn hoạt động với key deck; render null. */
export function ContentBridge() {
  useEffect(() => {
    let alive = true;
    loadVocab()
      .then((d) => {
        if (!alive) return;
        setVocabData(d);
        /* Bắn tick store giống word-list/lesson-client — các view chỉ sync lại
           qua bye:progress (review-dashboard, hanzi-studio...) cần re-render
           sau khi vocab sẵn sàng, không phải chờ một event khác. */
        window.dispatchEvent(new CustomEvent("bye:progress"));
      })
      .catch(() => {
        /* giữ null — như behavior defensive cũ */
      });
    return () => {
      alive = false;
    };
  }, []);
  return null;
}
