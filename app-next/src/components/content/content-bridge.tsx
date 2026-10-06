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
        if (alive) setVocabData(d);
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
