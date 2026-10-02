"use client";

/* Port 1:1 từ clone/js/reading.js — trang Bài đọc (/reading).
   Karaoke: TTS từng câu + highlight span ký tự (onboundary nếu có, fallback timer 260ms/ký tự/rate,
   grace 2500ms). Dán đoạn văn ≤ 3000 ký tự; demo doc + MCQ + từ vựng (demo). */

import { useState } from "react";
import { readingData, type ReadingSentence } from "@/content/reading";
import { useKaraoke, buildSentences, extractTitle, type KaraokeSentence } from "@/components/reading/karaoke";
import { ToastProvider, useToastSafe } from "@/components/shell/toast-provider";
import { LoginProvider, LoginModal, useLoginModal, useMockLogin } from "@/components/shell/login-modal";

const MAX = 3000;
const HL_STYLE = { background: "var(--nhai-gold)", borderRadius: "3px" } as const;

function zhFull(doc: { sentences: { zh: string }[] }) {
  return doc.sentences.map((s) => s.zh).join("");
}
function normalize(t: string) {
  return String(t).replace(/\s+/g, "");
}

type Doc = {
  title: string;
  meta: string;
  sentences: KaraokeSentence[];
  extras: typeof readingData.demoDoc | null;
};

/* ---------- account-box (sidebar) ---------- */
function AccountBox() {
  const { loggedIn } = useMockLogin();
  const { openLogin } = useLoginModal();
  if (loggedIn) {
    return (
      <p className="text-sm text-[var(--nhai-muted)]">
        Chưa có bài nào được lưu — bài bạn bấm “Tạo bài đọc” sẽ xuất hiện ở đây (demo).
      </p>
    );
  }
  return (
    <>
      <p className="text-sm text-[var(--nhai-muted)] mb-3">Đăng nhập để lưu bài đã tạo và mở lại mọi lúc.</p>
      <button type="button" onClick={openLogin} className="btn-ghost w-full px-4 py-2 rounded-lg text-sm font-bold">
        Đăng nhập
      </button>
    </>
  );
}

/* ---------- callout thu gọn (text verbatim clone/reading.html) ---------- */
function Callout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-2 border-[var(--nhai-border)] rounded-xl mb-4 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left font-bold hover:bg-[var(--nhai-soft)]"
        aria-expanded={open}
      >
        <span aria-hidden="true">💡</span>
        <span className="flex-1">Phương pháp đọc hiểu hiệu quả nhất (6 bước với 1 bài)</span>
        <span className="text-sm text-[var(--nhai-muted)]">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <ol className="list-decimal ml-5 space-y-1 text-sm text-[var(--nhai-muted)]">
            <li>Đọc lướt cả bài một lần để nắm đại ý, không cần hiểu từng chữ.</li>
            <li>Bật audio đọc cả bài, vừa nghe vừa nhìn chữ — đừng dừng lại.</li>
            <li>Đọc từng câu: bấm ▶, theo dõi chữ sáng, bắt chước ngữ điệu (shadowing).</li>
            <li>Mở bản dịch và pinyin, đối chiếu với những chỗ mình hiểu sai.</li>
            <li>Tìm từ vựng mới, bấm ⭐ thêm vào sổ tay để ôn lại sau.</li>
            <li>Ngày hôm sau nghe lại bài đó một lần — bạn sẽ hiểu sâu hơn hẳn.</li>
          </ol>
        </div>
      )}
    </div>
  );
}

/* ---------- Câu hỏi & Từ vựng (chỉ cho văn bản mẫu) ---------- */
function Extras({ doc, toast }: { doc: NonNullable<Doc["extras"]>; toast: (m: string) => void }) {
  const [solved, setSolved] = useState<Record<number, number>>({});
  return (
    <>
      <h3 className="text-xl font-extrabold mt-6 mb-3">Câu hỏi &amp; Từ vựng</h3>
      <div className="space-y-3">
        {doc.questions.map((q, qi) => (
          <div key={qi} className="border-2 border-[var(--nhai-border)] rounded-lg p-3">
            <p className="zh font-bold">{q.q}</p>
            <p className="text-xs text-[var(--nhai-muted)] mb-2">{q.qVi}</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {q.options.map((opt, oi) => {
                const isCorrect = solved[qi] === oi;
                return (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => {
                      if (oi === q.answer) {
                        setSolved((s) => ({ ...s, [qi]: oi }));
                        toast("Chính xác! 🎉");
                      } else {
                        toast("Chưa đúng — thử lại nhé!");
                      }
                    }}
                    className={
                      "btn-ghost zh text-left px-3 py-2 rounded-lg text-sm" +
                      (isCorrect ? " border-[var(--nhai-main)] text-[var(--nhai-main)]" : "")
                    }
                  >
                    {String.fromCharCode(65 + oi)}. {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <h3 className="text-lg font-extrabold mt-6 mb-2">Từ vựng trong bài</h3>
      <ul className="grid sm:grid-cols-2 gap-2 mb-2">
        {doc.vocab.map((v) => (
          <li key={v.word} className="border-2 border-[var(--nhai-border)] rounded-lg px-3 py-2 flex items-center gap-3">
            <span className="zh font-bold text-lg">{v.word}</span>
            <span className="zh text-xs text-[var(--nhai-accent)]">{v.py}</span>
            <span className="text-sm text-[var(--nhai-muted)] flex-1">{v.vi}</span>
            <button
              type="button"
              onClick={() => toast(`Đã thêm「${v.word}」vào sổ từ vựng (demo) ⭐`)}
              className="btn-ghost w-8 h-8 rounded-full shrink-0"
              aria-label={`Thêm ${v.word} vào sổ từ vựng`}
            >
              ⭐
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function ReadingClientInner() {
  const toast = useToastSafe();
  const [text, setText] = useState("");
  const [doc, setDoc] = useState<Doc | null>(null);
  const [showVi, setShowVi] = useState(false);
  const [showPy, setShowPy] = useState(false);
  const k = useKaraoke(doc?.sentences ?? []);

  const syncCounter = (v: string) => (v.length > MAX ? v.slice(0, MAX) : v);

  const fillSample = () => {
    setText(syncCounter(readingData.sampleText));
    toast("Đã điền văn bản mẫu — bấm “Tạo bài đọc” nhé!");
  };

  const createDoc = () => {
    const raw = text.trim();
    if (!raw) {
      toast("Hãy dán văn bản tiếng Trung vào ô trước nhé!");
      return;
    }
    k.stop();
    const sliced = raw.slice(0, MAX);
    const { title, body } = extractTitle(sliced);
    const sentenceMap: Record<string, ReadingSentence> = {};
    readingData.demoDoc.sentences.forEach((s) => {
      sentenceMap[s.zh] = s;
    });
    const sentences = buildSentences(body, sentenceMap);
    if (!sentences.length) {
      toast("Không tìm thấy câu tiếng Trung nào trong văn bản.");
      return;
    }
    const isDemoFull = normalize(body) === normalize(zhFull(readingData.demoDoc));
    setDoc({
      title: title || sentences[0].zh,
      meta: `${sentences.length} câu · ${body.length} ký tự`,
      sentences,
      extras: isDemoFull ? readingData.demoDoc : null,
    });
  };

  const openDemo = () => {
    k.stop();
    const d = readingData.demoDoc;
    setDoc({
      title: d.title,
      meta: `${d.meta} — ${d.sentences.length} câu`,
      sentences: d.sentences.map((s) => ({ zh: s.zh, py: s.py, vi: s.vi })),
      extras: d,
    });
  };

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
      {/* ---------- sidebar ---------- */}
      <aside className="space-y-4">
        <div className="card shadow-neo p-4">
          <h2 className="font-extrabold mb-2">Bài đọc mẫu</h2>
          <button type="button" onClick={openDemo} className="btn-ghost w-full text-left px-3 py-2.5 rounded-lg">
            <span className="zh font-bold text-base">一个人的生活</span>
            <span className="block text-xs text-[var(--nhai-muted)] mt-0.5">
              Cuộc sống một mình — 2:29 · 654 ký tự
            </span>
          </button>
        </div>
        <div className="card shadow-neo p-4">
          <AccountBox />
        </div>
      </aside>

      {/* ---------- main ---------- */}
      <div>
        <h1 className="text-3xl font-extrabold mb-4">Bài đọc</h1>

        <Callout />

        <div className="card shadow-neo p-4 mb-4">
          <label htmlFor="reading-input" className="sr-only">
            Nội dung bài đọc
          </label>
          <textarea
            id="reading-input"
            data-input
            value={text}
            onChange={(e) => setText(syncCounter(e.target.value))}
            rows={7}
            className="w-full border-2 border-[var(--nhai-border)] rounded-lg p-3 text-base zh"
            placeholder="Dán văn bản tiếng Trung vào đây…"
          />
          <div className="flex items-center justify-between gap-2 flex-wrap mt-2">
            <span className="text-xs text-[var(--nhai-muted)]" data-counter>
              {text.length}/{MAX}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={fillSample} className="btn-ghost px-4 py-2 rounded-lg text-sm font-bold">
                Điền văn bản mẫu
              </button>
              <button type="button" onClick={createDoc} className="btn-main px-4 py-2 rounded-lg text-sm font-extrabold">
                Tạo bài đọc
              </button>
            </div>
          </div>
        </div>

        {doc && (
          <div className="card shadow-neo p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div>
                <h2 className="zh text-2xl font-extrabold">{doc.title}</h2>
                <p className="text-sm text-[var(--nhai-muted)] mt-0.5">{doc.meta}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  data-playing={k.playingAll ? "true" : "false"}
                  onClick={() => (k.playingAll ? k.stop() : k.playFrom(0, true))}
                  className="btn-main px-4 py-2 rounded-lg text-sm font-extrabold"
                >
                  {k.playingAll ? "⏹ Dừng" : "🔊 Phát cả bài"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowVi((v) => !v)}
                  className={"pill px-3 py-1.5 rounded-full text-sm font-bold" + (showVi ? " pill-active" : "")}
                >
                  Dịch
                </button>
                <button
                  type="button"
                  onClick={() => setShowPy((v) => !v)}
                  className={"pill px-3 py-1.5 rounded-full text-sm font-bold" + (showPy ? " pill-active" : "")}
                >
                  Pinyin
                </button>
                <select
                  defaultValue="1"
                  onChange={(e) => k.setRate(parseFloat(e.target.value) || 1)}
                  className="pill px-2 py-1.5 rounded-full text-sm font-bold"
                  aria-label="Tốc độ đọc"
                >
                  <option value="0.7">0.7×</option>
                  <option value="1">1×</option>
                  <option value="1.3">1.3×</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              {doc.sentences.map((s, i) => (
                <div key={i} className="border-2 border-[var(--nhai-border)] rounded-lg p-3" data-row={i}>
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        k.stop();
                        k.playFrom(i, false);
                      }}
                      className="btn-ghost w-9 h-9 shrink-0 rounded-full"
                      aria-label={`Đọc câu ${i + 1}`}
                    >
                      {k.activeIdx === i ? "⏹" : "▶"}
                    </button>
                    <div className="min-w-0">
                      <p className="zh text-xl leading-loose">
                        {Array.from(s.zh).map((c, ci) => (
                          <span
                            key={ci}
                            className="zh-char inline-block"
                            style={
                              k.highlight && k.highlight.row === i && k.highlight.char === ci ? HL_STYLE : undefined
                            }
                          >
                            {c === " " ? "\u00A0" : c}
                          </span>
                        ))}
                      </p>
                      {showPy && s.py && <p className="zh text-sm text-[var(--nhai-accent)] mt-1">{s.py}</p>}
                      {showVi && <p className="text-sm text-[var(--nhai-muted)] mt-1">{s.vi}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {doc.extras && <Extras doc={doc.extras} toast={toast} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReadingClient() {
  return (
    <ToastProvider>
      <LoginProvider>
        <ReadingClientInner />
        <LoginModal />
      </LoginProvider>
    </ToastProvider>
  );
}
