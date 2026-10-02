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
              <span className="block text-[10px] leading-tight text-[var(--nhai-muted)]">{py}</span>
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
    <div className="card shadow-neo p-5 mb-4">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="zh text-5xl font-bold leading-none">{e.hanzi}</div>
        <div className="min-w-0">
          <div className="text-lg font-semibold">{pyJoin(e)}</div>
          {e.traditional && (
            <div>
              <span className="text-sm text-[var(--nhai-muted)]">
                (Phồn thể: <span className="zh">{e.traditional}</span><span>)</span>
              </span>
            </div>
          )}
        </div>
        <button type="button" className="btn-ghost w-9 h-9 ml-auto sm:ml-0" title={"Phát âm " + e.hanzi} onClick={() => speak(e.hanzi, { lang: "zh-CN" })}>🔊</button>
      </div>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="text-base font-bold">{e.meanings[0] || ""}</span>
        {e.pos && (
          <span className="text-xs font-semibold border-2 border-[var(--nhai-border)] rounded-full px-2.5 py-0.5 text-[var(--nhai-muted)]">{e.pos}</span>
        )}
        {e.level && (
          <span className="text-xs font-bold border-2 border-[var(--nhai-main)] text-[var(--nhai-main)] rounded-full px-2.5 py-0.5">{e.level}</span>
        )}
        <button type="button" className="btn-ghost px-3 py-1.5 text-sm ml-auto" onClick={() => onAdd(e)}>
          <span style={saved ? { color: "var(--nhai-gold)" } : undefined}>⭐</span> Thêm vào sổ tay
        </button>
      </div>
      <div className="mt-3 text-sm text-[var(--nhai-muted)]">
        Xem từng chữ:{" "}
        <span className="inline-flex gap-1 align-middle">
          {e.hanzi.split("").map((ch, i) => (
            <Link
              key={i}
              href={"/hanzi/" + encodeURIComponent(ch)}
              className="zh inline-flex w-9 h-9 items-center justify-center border-2 border-[var(--nhai-border)] rounded-md text-lg font-bold hover:border-[var(--nhai-main)] hover:text-[var(--nhai-main)]"
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
            <div key={i} className="bg-[var(--nhai-soft)] rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="text-lg leading-snug flex-1">
                  <ZhWithPy zh={ex.zh} pinyinPerChar={ex.pinyinPerChar} />
                </div>
                <button type="button" className="btn-ghost w-8 h-8 shrink-0" title={"Phát âm " + ex.zh} onClick={() => speak(ex.zh, { lang: "zh-CN" })}>🔊</button>
              </div>
              <div className="text-sm text-[var(--nhai-muted)] mt-1">{ex.vi}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
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
    toast("Đã thêm vào Sổ tay từ vựng ⭐");
  }

  const has = q.trim().length > 0;

  return (
    <div>
      {/* search bar */}
      <div className="flex gap-2 items-center flex-wrap mb-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
          placeholder="Chữ Hán, pinyin hoặc nghĩa tiếng Việt… (vd: 学习, xuexi, học)"
          className="input flex-1 min-w-[220px]"
          aria-label="Từ khoá tra từ điển"
        />
        <button type="button" className="btn-main px-4 py-2 text-sm font-bold" disabled={!has} onClick={() => doSearch()}>Tra từ</button>
        {has && (
          <button
            type="button"
            className="btn-ghost w-9 h-9"
            title="Xoá từ khoá"
            onClick={() => { setQ(""); setUrl(""); setSubmitted(null); }}
          >✕</button>
        )}
        <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => setDrawOpen(true)}>✍️ Vẽ chữ để tra</button>
      </div>

      {results === null ? (
        <div className="card shadow-neo p-5">
          <h2 className="text-lg font-extrabold mb-3">Gợi ý tra nhanh</h2>
          <div className="flex flex-wrap gap-2">
            {QUICK.map((w) => (
              <button key={w} type="button" className="pill zh text-lg" onClick={() => doSearch(w)}>{w}</button>
            ))}
          </div>
          <p className="text-sm text-[var(--nhai-muted)] mt-4">
            Nhập chữ Hán (学习), pinyin không dấu (xuexi) hoặc nghĩa tiếng Việt (học) rồi bấm “Tra từ”.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-[var(--nhai-muted)]">Không tìm thấy “{submitted}”. Thử chữ Hán, pinyin không dấu hoặc nghĩa tiếng Việt.</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="text-sm font-semibold text-[var(--nhai-muted)]">Trung → Việt</div>
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
