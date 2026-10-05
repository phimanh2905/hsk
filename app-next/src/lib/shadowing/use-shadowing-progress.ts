"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/use-session";
import { useToastSafe } from "@/components/shell/toast-provider";
import { readLocalProgress, writeLocalProgress, clearLocalProgress, computeMetrics, type ProgressMap, type ProgressRec, type ProgressStatus } from "@/lib/shadowing/progress";

export type PracticePatch = { status?: ProgressStatus; score?: number; secondsDelta?: number; linesDoneDelta?: number };

export function useShadowingProgress() {
  const { loggedIn, isPending } = useSession();
  const toast = useToastSafe();
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const [ready, setReady] = useState(loggedIn ? false : true);
  const mapRef = useRef(progressMap);
  mapRef.current = progressMap;

  const applyLocal = useCallback((videoId: string, patch: PracticePatch) => {
    const prev = mapRef.current[videoId];
    const next: ProgressRec = {
      status: (prev?.status === "done" ? "done" : patch.status === "done" ? "done" : "mid") as ProgressStatus,
      score: Math.max(prev?.score ?? 0, patch.score ?? 0) || null,
      seconds: (prev?.seconds ?? 0) + (patch.secondsDelta ?? 0),
      linesDone: (prev?.linesDone ?? 0) + (patch.linesDoneDelta ?? 0),
      updatedAt: new Date().toISOString(),
    };
    mapRef.current = { ...mapRef.current, [videoId]: next }; // đồng bộ ngay cho writeLocalProgress
    setProgressMap((m) => ({ ...m, [videoId]: next }));
    return next;
  }, []);

  // mount: user → GET + merge guest một lần; guest → đọc localStorage
  useEffect(() => {
    if (isPending) return;
    if (!loggedIn) { setProgressMap(readLocalProgress()); setReady(true); return; }
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/v1/shadowing/progress", { method: "GET" });
        const server: ProgressMap = {};
        if (res.ok) {
          const { items } = (await res.json()) as {
            items: Array<{ videoId: string; status: ProgressStatus; score: number | null; seconds: number; linesDone: number; updatedAt: string }>;
          };
          for (const it of items) server[it.videoId] = { status: it.status, score: it.score, seconds: it.seconds, linesDone: it.linesDone, updatedAt: it.updatedAt };
        }
        const guest = readLocalProgress();
        const guestIds = Object.keys(guest).filter((id) => !server[id]);
        // merge một lần: guest record thiếu trên server → PUT lên rồi clear key guest
        await Promise.all(guestIds.map((id) =>
          fetch(`/api/v1/shadowing/progress/${id}`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: guest[id].status, score: guest[id].score ?? undefined, secondsDelta: guest[id].seconds, linesDoneDelta: guest[id].linesDone }),
          })
        ));
        if (guestIds.length) clearLocalProgress();
        if (alive) { setProgressMap({ ...guest, ...server }); setReady(true); }
      } catch {
        if (alive) { setProgressMap(readLocalProgress()); setReady(true); } // server hỏng → fallback local
      }
    })();
    return () => { alive = false; };
  }, [loggedIn, isPending]);

  const recordPractice = useCallback((videoId: string, patch: PracticePatch) => {
    applyLocal(videoId, patch);
    if (!loggedIn) { writeLocalProgress(mapRef.current); return; }
    fetch(`/api/v1/shadowing/progress/${videoId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => toast?.("Chưa đồng bộ được tiến độ — sẽ thử lại ở lần luyện sau"));
  }, [loggedIn, applyLocal, toast]);

  return { progressMap, metrics: computeMetrics(progressMap), recordPractice, ready };
}
