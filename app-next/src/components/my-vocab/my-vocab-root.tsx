"use client";

/* Sổ tay từ vựng root — port 1:1 opendesign_hsk/my-vocab.html (spec 2026-10-05).
   Data thật: buildVocabIndex(SRS ∪ deck rows ∪ vocabBook) + wordMeta store.
   mounted gate chống hydration (pattern NotebookList); keyboard / focus search,
   Escape đóng drawer/modal (listener riêng — useKeyboard bỏ INPUT/TEXTAREA). */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { progressStore } from "@/lib/store/progress-store";
import { buildVocabIndex, type VocabRow } from "@/lib/my-vocab";
import { useTts } from "@/lib/tts/use-tts";
import { useKeyboard } from "@/lib/use-keyboard";
import { useToastSafe } from "@/components/shell/toast-provider";
import { VocabHero } from "./vocab-hero";
import { VocabControls } from "./vocab-controls";
import { DeckGrid, type DeckCard } from "./deck-grid";
import { VocabTable } from "./vocab-table";
import { WordDrawer } from "./word-drawer";
import { DeckModal } from "./deck-modal";

/* mastery cho 1 tập con row (same công thức buildVocabIndex.mastery) */
function masteryOf(rows: VocabRow[]): number {
  if (!rows.length) return 0;
  const s = rows.reduce((a, r) => a + (r.status === "master" ? 1 : r.status === "study" ? 0.5 : 0), 0);
  return Math.round((s / rows.length) * 100);
}

const EMPTY_INDEX = { rows: [], dueCount: 0, mastery: 0, hskTarget: null } as const;

/* search bỏ dấu ("ai" khớp "ài") — NFD strip combining marks + đ→d */
function foldNorm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
}

export default function MyVocabRoot() {
  const router = useRouter();
  const toast = useToastSafe();
  const { speak } = useTts();
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"decks" | "list">("decks");
  const [hsk, setHsk] = useState<string>("all");
  const [q, setQ] = useState("");
  const [drawerZh, setDrawerZh] = useState<string | null>(null);
  const [deckModal, setDeckModal] = useState(false);
  const [decks, setDecks] = useState(() => progressStore.listDecks("vocab"));
  const [meta, setMeta] = useState(() => progressStore.getWordMeta());
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setMounted(true), []);

  /* đồng bộ khi bất kỳ mutation nào phát bye:progress (star/note/create deck) */
  useEffect(() => {
    const refresh = () => {
      setDecks(progressStore.listDecks("vocab"));
      setMeta(progressStore.getWordMeta());
    };
    window.addEventListener("bye:progress", refresh);
    return () => window.removeEventListener("bye:progress", refresh);
  }, []);

  const index = useMemo(
    () =>
      mounted
        ? buildVocabIndex({
            srs: progressStore.getAllSrs(),
            decks,
            vocabBook: progressStore.getVocabBook(),
            meta,
            now: Date.now(),
          })
        : EMPTY_INDEX,
    [decks, meta, mounted], // mounted: Date.now() chỉ sau mount (chống hydration mismatch)
  );

  const filtered = useMemo(() => index.rows.filter((r) => {
    if (hsk === "star" && !r.star) return false;
    if (hsk !== "all" && hsk !== "star" && r.hsk !== hsk) return false;
    if (q) {
      const s = foldNorm(r.zh + r.py + r.hv + r.vi);
      if (!s.includes(foldNorm(q))) return false;
    }
    return true;
  }), [index, hsk, q]);

  const deckCards: DeckCard[] = useMemo(() => {
    const due = index.rows.filter((r) => r.hasSrs && r.status !== "master");
    const starred = index.rows.filter((r) => r.star);
    return [
      { id: "due", name: "Từ cần ôn ngay", meta: `${due.length} từ đến hạn`, mastery: masteryOf(due), icon: "inbox" },
      { id: "star", name: "Từ đã sao", meta: `${starred.length} từ đã sao`, mastery: masteryOf(starred), icon: "star" },
      ...decks.map((d) => {
        const rowsOfDeck = index.rows.filter((r) => r.deckIds.includes(d.id));
        return { id: d.id, name: d.name, meta: `${d.rows.length} từ trong deck`, mastery: masteryOf(rowsOfDeck), icon: "folder" as const };
      }),
    ];
  }, [index, decks]);

  const drawerRow = drawerZh ? index.rows.find((r) => r.zh === drawerZh) ?? null : null;

  useKeyboard({
    "/": (e) => { e.preventDefault(); searchRef.current?.focus(); },
  });

  /* Escape đóng drawer/modal — listener riêng vì useKeyboard bỏ qua INPUT/TEXTAREA */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setDrawerZh(null);
      setDeckModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Space phát âm khi drawer mở (port mock) */
  useEffect(() => {
    if (!drawerRow) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toUpperCase();
      if (e.code === "Space" && tag !== "TEXTAREA" && tag !== "INPUT") {
        e.preventDefault();
        speak(drawerRow.zh, { rate: 0.85 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerRow, speak]);

  if (!mounted) return null;

  const study = (id: string) => {
    if (id === "due" || id === "star") router.push("/review");
    else router.push(`/lesson/custom/${id}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <VocabHero
        dueCount={index.dueCount}
        total={index.rows.length}
        mastery={index.mastery}
        hskTarget={index.hskTarget}
        onReview={() => router.push("/review")}
      />

      <VocabControls
        view={view}
        onView={setView}
        hsk={hsk}
        onHsk={(h) => { setHsk(h); if (view !== "list") setView("list"); }} // Review Focus #3
        q={q}
        onQ={setQ}
        onNewDeck={() => setDeckModal(true)}
        searchRef={searchRef}
      />

      <div className={view === "decks" ? "" : "hidden"}>
        <DeckGrid
          decks={deckCards}
          onStudy={study}
          onMenu={() => toast("Thao tác deck: đổi tên · xóa (bản demo giữ deck cố định)")}
        />
      </div>

      <div className={view === "list" ? "" : "hidden"}>
        <VocabTable
          rows={filtered}
          onOpen={setDrawerZh}
          onSpeak={(zh) => speak(zh, { rate: 0.85 })}
        />
      </div>

      {drawerRow && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setDrawerZh(null)}
            className="fixed inset-0 z-50 bg-scrim transition-opacity"
          />
          <WordDrawer
            row={drawerRow}
            onClose={() => setDrawerZh(null)}
            onStar={(zh) => {
              const starred = progressStore.toggleWordStar(zh);
              toast(starred ? "Đã gắn sao" : "Đã bỏ gắn sao");
            }}
            onSaveNote={(zh, note) => { progressStore.setWordNote(zh, note); toast("Đã lưu ghi chú"); }}
            onPractice={(zh) => toast(`Luyện từ “${zh}” — mở lesson trong bản đầy đủ`)}
          />
        </>
      )}

      <DeckModal
        open={deckModal}
        onClose={() => setDeckModal(false)}
        onCreate={(name) => {
          if (!name) { toast("Hãy đặt tên cho deck"); return; }
          progressStore.createDeck("vocab", name);
          setDeckModal(false);
          toast(`Đã tạo deck “${name}”`); // bye:progress event tự refresh decks
        }}
      />
    </div>
  );
}
