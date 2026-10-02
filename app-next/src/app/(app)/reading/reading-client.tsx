"use client";

/* Port 1:1 từ clone/js/reading.js — trang Bài đọc (/reading).
   Karaoke: TTS từng câu + highlight span ký tự (onboundary nếu có, fallback timer 260ms/ký tự/rate,
   grace 2500ms). Dán đoạn văn ≤ 3000 ký tự; demo doc + MCQ + từ vựng (demo). */

import { useState } from "react";
import { readingData, type ReadingSentence } from "@/content/reading";
import { useKaraoke, buildSentences, extractTitle, type KaraokeSentence } from "@/components/reading/karaoke";
import { ToastProvider, useToastSafe } from "@/components/shell/toast-provider";
import { LoginProvider, LoginModal, useLoginModal } from "@/components/shell/login-modal";
import { useSession } from "@/lib/use-session";
import { Volume2, Square, Play, Lightbulb, Star } from "@/components/ui/icon";
import { ICON_STROKE } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Select } from "@/components/ui/select";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";

const MAX = 3000;

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
  const { loggedIn } = useSession();
  const { openLogin } = useLoginModal();
  if (loggedIn) {
    return (
      <p className="text-sm text-text-secondary">
        Chưa có bài nào được lưu — bài bạn bấm “Tạo bài đọc” sẽ xuất hiện ở đây (demo).
      </p>
    );
  }
  return (
    <>
      <p className="text-sm text-text-secondary mb-3">Đăng nhập để lưu bài đã tạo và mở lại mọi lúc.</p>
      <Button type="button" variant="secondary" onClick={openLogin} className="w-full">
        Đăng nhập
      </Button>
    </>
  );
}

/* ---------- callout thu gọn (text verbatim clone/reading.html) ---------- */
function Callout() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="mb-4 p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left font-bold hover:bg-surface-paper"
        aria-expanded={open}
      >
        <Lightbulb size={18} strokeWidth={ICON_STROKE} className="text-learning-streak shrink-0" aria-hidden="true" />
        <span className="flex-1">Phương pháp đọc hiểu hiệu quả nhất (6 bước với 1 bài)</span>
        <span className="text-sm text-text-secondary">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <ol className="list-decimal ml-5 space-y-1 text-sm text-text-secondary">
            <li>Đọc lướt cả bài một lần để nắm đại ý, không cần hiểu từng chữ.</li>
            <li>Bật audio đọc cả bài, vừa nghe vừa nhìn chữ — đừng dừng lại.</li>
            <li>Đọc từng câu: bấm ▶, theo dõi chữ sáng, bắt chước ngữ điệu (shadowing).</li>
            <li>Mở bản dịch và pinyin, đối chiếu với những chỗ mình hiểu sai.</li>
            <li>Tìm từ vựng mới, bấm ⭐ thêm vào sổ tay để ôn lại sau.</li>
            <li>Ngày hôm sau nghe lại bài đó một lần — bạn sẽ hiểu sâu hơn hẳn.</li>
          </ol>
        </div>
      )}
    </Card>
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
          <div key={qi} className="border border-border-default rounded-card p-3">
            <p className="zh font-bold">{q.q}</p>
            <p className="text-xs text-text-secondary mb-2">{q.qVi}</p>
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
                        toast("Chính xác!");
                      } else {
                        toast("Chưa đúng — thử lại nhé!");
                      }
                    }}
                    className={cn(
                      "zh text-left min-h-[52px] px-3 py-2 rounded-control border text-sm bg-surface-elevated text-text-primary transition-colors",
                      isCorrect
                        ? "border-feedback-success text-feedback-success font-bold"
                        : "border-border-default hover:border-action-primary",
                    )}
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
          <li key={v.word} className="border border-border-default rounded-card px-3 py-2 flex items-center gap-3">
            <span className="zh font-bold text-lg">{v.word}</span>
            <span className="zh text-xs text-text-secondary">{v.py}</span>
            <span className="text-sm text-text-secondary flex-1">{v.vi}</span>
            <IconButton
              label={`Thêm ${v.word} vào sổ từ vựng`}
              onClick={() => toast(`Đã thêm「${v.word}」vào sổ từ vựng (demo)`)}
              className="w-9 h-9 min-h-9 min-w-9 shrink-0"
            >
              <Star size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
            </IconButton>
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
    <div className="mx-auto w-full max-w-[820px]">
      <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* ---------- sidebar ---------- */}
        <aside className="space-y-4">
          <Card className="p-4">
            <h2 className="font-extrabold mb-2">Bài đọc mẫu</h2>
            <button type="button" onClick={openDemo} className="w-full text-left px-3 py-2.5 rounded-control hover:bg-surface-paper">
              <span className="zh font-bold text-base">一个人的生活</span>
              <span className="block text-xs text-text-secondary mt-0.5">
                Cuộc sống một mình — 2:29 · 654 ký tự
              </span>
            </button>
          </Card>
          <Card className="p-4">
            <AccountBox />
          </Card>
        </aside>

        {/* ---------- main ---------- */}
        <div>
          <h1 className="text-3xl font-extrabold mb-4">Bài đọc</h1>

          <Callout />

          <Card className="p-4 mb-4">
            <label htmlFor="reading-input" className="sr-only">
              Nội dung bài đọc
            </label>
            <textarea
              id="reading-input"
              data-input
              value={text}
              onChange={(e) => setText(syncCounter(e.target.value))}
              rows={7}
              className="w-full rounded-control border border-border-default bg-surface-elevated p-3 text-base zh focus:outline-none focus:ring-3 ring-action-focus ring-offset-2"
              placeholder="Dán văn bản tiếng Trung vào đây…"
            />
            <div className="flex items-center justify-between gap-2 flex-wrap mt-2">
              <span className="text-xs text-text-secondary" data-counter>
                {text.length}/{MAX}
              </span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={fillSample}>
                  Điền văn bản mẫu
                </Button>
                <Button type="button" size="sm" onClick={createDoc}>
                  Tạo bài đọc
                </Button>
              </div>
            </div>
          </Card>

          {doc && (
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <h2 className="zh text-2xl font-extrabold">{doc.title}</h2>
                  <p className="text-sm text-text-secondary mt-0.5">{doc.meta}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    data-playing={k.playingAll ? "true" : "false"}
                    onClick={() => (k.playingAll ? k.stop() : k.playFrom(0, true))}
                  >
                    {k.playingAll ? <Square size={16} strokeWidth={ICON_STROKE} aria-hidden="true" /> : <Volume2 size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />}
                    {k.playingAll ? "Dừng" : "Phát cả bài"}
                  </Button>
                  <Chip selected={showVi} onClick={() => setShowVi((v) => !v)}>
                    Dịch
                  </Chip>
                  <Chip selected={showPy} onClick={() => setShowPy((v) => !v)}>
                    Pinyin
                  </Chip>
                  <Select
                    defaultValue="1"
                    onChange={(e) => k.setRate(parseFloat(e.target.value) || 1)}
                    aria-label="Tốc độ đọc"
                    className="text-sm min-h-11 py-1.5"
                  >
                    <option value="0.7">0.7×</option>
                    <option value="1">1×</option>
                    <option value="1.3">1.3×</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                {doc.sentences.map((s, i) => {
                  const isActive = k.activeIdx === i;
                  return (
                    <div
                      key={i}
                      data-row={i}
                      className={cn(
                        "rounded-control border p-3 transition-colors",
                        isActive ? "border-action-primary bg-action-primary/10" : "border-border-default",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <IconButton
                          label={`Đọc câu ${i + 1}`}
                          onClick={() => {
                            k.stop();
                            k.playFrom(i, false);
                          }}
                          className="w-9 h-9 min-h-9 min-w-9 shrink-0"
                        >
                          {isActive ? <Square size={16} strokeWidth={ICON_STROKE} aria-hidden="true" /> : <Play size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />}
                        </IconButton>
                        <div className="min-w-0">
                          {/* Highlight câu đang đọc: nền jade/10 + underline — không chỉ màu một mình */}
                          <p
                            className={cn(
                              "zh text-xl leading-loose",
                              isActive && "underline decoration-action-primary decoration-2 underline-offset-4",
                            )}
                          >
                            {Array.from(s.zh).map((c, ci) => (
                              <span
                                key={ci}
                                className={cn(
                                  "zh-char inline-block",
                                  k.highlight && k.highlight.row === i && k.highlight.char === ci &&
                                    "bg-action-primary/10 underline decoration-action-primary decoration-2 underline-offset-4",
                                )}
                              >
                                {c === " " ? "\u00A0" : c}
                              </span>
                            ))}
                          </p>
                          {showPy && s.py && <p className="zh text-sm text-text-secondary mt-1">{s.py}</p>}
                          {showVi && <p className="text-sm text-text-secondary mt-1">{s.vi}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {doc.extras && <Extras doc={doc.extras} toast={toast} />}
            </Card>
          )}
        </div>
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
