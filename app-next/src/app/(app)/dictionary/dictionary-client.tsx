"use client";
/* Port 1:1 từ clone/js/dictionary.js — trang Tra từ điển (/dictionary).
   Search 3 kiểu (searchEntries): chữ Hán / pinyin không dấu / nghĩa Việt substring.
   ?q= cập nhật bằng replaceState (F5 giữ kết quả); entry card + Sổ tay từ vựng (progressStore). */
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { dictionary, type DictEntry } from "@/content/dictionary";
import { searchEntries, pyJoin } from "@/lib/search/dictionary";
import { progressStore } from "@/lib/store/progress-store";
import { useTts } from "@/lib/tts/use-tts";
import { ToastProvider, useToastSafe } from "@/components/shell/toast-provider";
import { DrawModal } from "@/components/hanzi/draw-modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Search, Volume2, BookmarkPlus, PenLine, X, ICON_STROKE } from "@/components/ui/icon";

const QUICK = ["学习", "你好", "时间", "老师", "学生"];

/* câu zh + pinyin từng chữ màu muted */
function ZhWithPy({ zh, pinyinPerChar }: { zh: string; pinyinPerChar: string[] }) {
  return (
    <>
      {zh.split("").map((ch, i) => {
        const py = pinyinPerChar && pinyinPerChar[i] ? pinyinPerChar[i] : "";
        if (py) {
          return (
            <span key={i} className="inline-block text-center mx-0.5 align-top">
              <span className="block text-[10px] leading-tight text-text-secondary">{py}</span>
              <span className="zh">{ch}</span>
            </span>
          );
        }
        return <span key={i} className="zh inline-block mx-0.5 align-top">{ch}</span>;
      })}
    </>
  );
}

function EntryCard({ e, saved, onAdd }: { e: DictEntry; saved: boolean; onAdd: (e: DictEntry) => void }) {
  const { speak } = useTts();
  return (
    <Card className="p-5 mb-4">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="zh text-5xl font-bold leading-none">{e.hanzi}</div>
        <div className="min-w-0">
          <div className="text-lg font-semibold">{pyJoin(e)}</div>
          {e.traditional && (
            <div>
              <span className="text-sm text-text-secondary">
                (Phồn thể: <span className="zh">{e.traditional}</span><span>)</span>
              </span>
            </div>
          )}
        </div>
        <IconButton label={"Phát âm " + e.hanzi} className="ml-auto sm:ml-0" onClick={() => speak(e.hanzi, { lang: "zh-CN" })}>
          <Volume2 size={20} strokeWidth={ICON_STROKE} />
        </IconButton>
      </div>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="text-base font-bold">{e.meanings[0] || ""}</span>
        {e.pos && <Chip className="min-h-7 px-2.5 text-xs font-semibold text-text-secondary">{e.pos}</Chip>}
        {e.level && <Chip selected className="min-h-7 px-2.5 text-xs font-bold">{e.level}</Chip>}
        <Button variant="secondary" size="sm" className="ml-auto" onClick={() => onAdd(e)}>
          <BookmarkPlus size={16} strokeWidth={ICON_STROKE} className={saved ? "text-learning-streak" : undefined} />
          Thêm vào sổ tay
        </Button>
      </div>
      <div className="mt-3 text-sm text-text-secondary">
        Xem từng chữ:{" "}
        <span className="inline-flex gap-1 align-middle">
          {e.hanzi.split("").map((ch, i) => (
            <Link
              key={i}
              href={"/hanzi/" + encodeURIComponent(ch)}
              className="zh inline-flex w-9 h-9 items-center justify-center border border-border-default rounded-control text-lg font-bold hover:border-action-primary hover:text-action-primary"
            >{ch}</Link>
          ))}
        </span>
      </div>
      <div className="mt-3">
        <div className="text-sm font-bold mb-1">Nghĩa</div>
        <ol className="list-decimal list-inside space-y-1 text-[15px]">
          {e.meanings.map((m, i) => <li key={i}>{m}</li>)}
        </ol>
      </div>
      <div className="mt-3">
        <div className="text-sm font-bold mb-2">Ví dụ</div>
        <div className="space-y-2">
          {e.examples.map((ex, i) => (
            <div key={i} className="bg-surface-paper border border-border-subtle rounded-control p-3">
              <div className="flex items-start gap-2">
                <div className="text-lg leading-snug flex-1">
                  <ZhWithPy zh={ex.zh} pinyinPerChar={ex.pinyinPerChar} />
                </div>
                <IconButton label={"Phát âm " + ex.zh} className="shrink-0" onClick={() => speak(ex.zh, { lang: "zh-CN" })}>
                  <Volume2 size={18} strokeWidth={ICON_STROKE} />
                </IconButton>
              </div>
              <div className="text-sm text-text-secondary mt-1">{ex.vi}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function DictionaryClientInner() {
  const searchParams = useSearchParams();
  const toast = useToastSafe();
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [submitted, setSubmitted] = useState<string | null>(() => {
    const v = searchParams.get("q");
    return v ? v.trim() || null : null;
  });
  const [savedHanzi, setSavedHanzi] = useState<Set<string>>(
    () => new Set(progressStore.getVocabBook().map((v) => v.hanzi)),
  );
  const [drawOpen, setDrawOpen] = useState(false);

  const results = submitted ? searchEntries(dictionary, submitted) : null;

  function setUrl(next: string) {
    try {
      window.history.replaceState(null, "", next ? "/dictionary?q=" + encodeURIComponent(next) : "/dictionary");
    } catch { /* có thể chặn — bỏ qua */ }
  }

  function doSearch(raw?: string) {
    const query = String(raw === undefined ? q : raw).trim();
    setUrl(query);
    setQ(query);
    setSubmitted(query || null);
  }

  function addToBook(entry: DictEntry) {
    const ok = progressStore.addToVocabBook({ hanzi: entry.hanzi, pinyin: pyJoin(entry), vi: entry.meanings[0] || "" });
    if (!ok) { toast("Từ này đã có trong Sổ tay từ vựng"); return; }
    setSavedHanzi(new Set(progressStore.getVocabBook().map((v) => v.hanzi)));
    toast("Đã thêm vào Sổ tay từ vựng");
  }

  const has = q.trim().length > 0;

  return (
    <div>
      {/* search bar */}
      <div className="flex gap-2 items-center flex-wrap mb-5">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
          placeholder="Chữ Hán, pinyin hoặc nghĩa tiếng Việt… (vd: 学习, xuexi, học)"
          className="flex-1 min-w-[220px]"
          aria-label="Từ khoá tra từ điển"
        />
        <Button size="sm" disabled={!has} onClick={() => doSearch()}>Tra từ</Button>
        {has && (
          <IconButton label="Xoá từ khoá" onClick={() => { setQ(""); setUrl(""); setSubmitted(null); }}>
            <X size={18} strokeWidth={ICON_STROKE} />
          </IconButton>
        )}
        <Button variant="secondary" size="sm" onClick={() => setDrawOpen(true)}>
          <PenLine size={16} strokeWidth={ICON_STROKE} />
          Vẽ chữ để tra
        </Button>
      </div>

      {results === null ? (
        <Card className="p-5">
          <h2 className="text-lg font-extrabold mb-3">Gợi ý tra nhanh</h2>
          <div className="flex flex-wrap gap-2">
            {QUICK.map((w) => (
              <Chip key={w} onClick={() => doSearch(w)} className="zh text-lg">{w}</Chip>
            ))}
          </div>
          <p className="text-sm text-text-secondary mt-4">
            Nhập chữ Hán (学习), pinyin không dấu (xuexi) hoặc nghĩa tiếng Việt (học) rồi bấm “Tra từ”.
          </p>
        </Card>
      ) : results.length === 0 ? (
        <Card className="p-8 text-center">
          <Search size={36} strokeWidth={ICON_STROKE} className="mx-auto mb-2 text-text-secondary" aria-hidden="true" />
          <p className="text-text-secondary">Không tìm thấy “{submitted}”. Thử chữ Hán, pinyin không dấu hoặc nghĩa tiếng Việt.</p>
        </Card>
      ) : (
        <>
          <div className="mb-4">
            <div className="text-sm font-semibold text-text-secondary">Trung → Việt</div>
            <h2 className="text-xl font-extrabold">{results.length} kết quả cho “<span className="zh">{submitted}</span>”</h2>
          </div>
          {results.map((e) => (
            <EntryCard key={e.hanzi} e={e} saved={savedHanzi.has(e.hanzi)} onAdd={addToBook} />
          ))}
        </>
      )}

      <DrawModal
        open={drawOpen}
        onClose={() => setDrawOpen(false)}
        onResult={(ch) => { setQ(ch); doSearch(ch); }}
      />
    </div>
  );
}

export default function DictionaryClient() {
  return (
    <ToastProvider>
      <DictionaryClientInner />
    </ToastProvider>
  );
}
