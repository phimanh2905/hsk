"use client";
/* ShadowingStudio (port shadowing-video.html) — engine dùng usePlayerEngine;
   ghi chú: nút Ẩn video, checkbox show-vi/py, Cài đặt của player cũ bị bỏ theo mock. */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePlayerEngine } from "@/components/shadowing/studio/use-player-engine";
import { useShadowingProgress } from "@/lib/shadowing/use-shadowing-progress";
import { normDict } from "@/lib/shadowing/dictation";
import { getAutoscroll } from "@/lib/shadowing/prefs";
import { useTts } from "@/lib/tts/use-tts";
import type { ShadowingVideo, SubtitleSentence } from "@/content/shadowing";
import { topicVi } from "@/content/shadowing";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useToast } from "@/components/shell/toast-provider";
import { Volume2, Play, Pause, Repeat, ChevronLeft, ICON_STROKE } from "@/components/ui/icon";

/* mm:ss — hàng "Câu {n} · {start} – {end}" của transcript */
function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.round(t % 60);
  return m + ":" + String(s).padStart(2, "0");
}

/* dictChars của mock: full text trừ dấu câu + khoảng trắng, tách từng chữ */
function dictChars(full: string): string[] {
  return full.replace(/[。，、！？…—\s]/g, "").split("");
}

export default function ShadowingStudio({
  video,
  subtitles: subs,
  enginePostSink,
}: {
  video: ShadowingVideo;
  subtitles: SubtitleSentence[];
  enginePostSink?: (m: string) => void;
}) {
  const eng = usePlayerEngine({ subs, postSink: enginePostSink });
  const toast = useToast();
  const { speak } = useTts();
  const { progressMap, recordPractice } = useShadowingProgress();
  const rec = progressMap[video.id];
  const [subMode, setSubMode] = useState<0 | 1 | 2>(2); // 0: chỉ hanzi, 1: chỉ pinyin, 2: cả hai
  // tab cột phải — đặt ở level component để record dock (Task 9) nhận dimmed={tab === "dict"}
  const [tab, setTab] = useState<"script" | "dict">("script");

  const linesDone = rec?.linesDone ?? 0;
  const pct = subs.length > 0 ? Math.round((linesDone / subs.length) * 100) : 0;

  /* ---------- transcript: autoscroll câu active theo pref (port renderActive) ---------- */
  const streamRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (tab !== "script" || !getAutoscroll()) return;
    const el = streamRef.current?.querySelector(`[data-sent="${eng.cur}"]`);
    try { el?.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch { /* jsdom */ }
  }, [eng.cur, tab]);

  /* ---------- dictation (port DictationPanel) — state reset theo câu ---------- */
  const curSub = subs[Math.min(eng.cur, subs.length - 1)] ?? subs[0];
  const full = curSub ? curSub.parts.map((p) => p.zh).join(" ") : "";
  const [value, setValue] = useState("");
  const [result, setResult] = useState<null | { kind: "empty" | "correct" | "wrong" }>(null);
  const [dictShown, setDictShown] = useState(0); // số chữ đã mở trong "Gợi ý ô trống"
  useEffect(() => { setValue(""); setResult(null); setDictShown(0); }, [curSub]);

  function check() {
    if (!curSub) return;
    if (!normDict(value)) { setResult({ kind: "empty" }); return; }
    const ok = normDict(value) === normDict(full);
    setResult({ kind: ok ? "correct" : "wrong" });
    if (ok) recordPractice(video.id, { score: 85, linesDoneDelta: 1 });
  }

  const hintLen = Math.max(8, Math.floor((curSub?.pinyin.length ?? 0) * 0.4));
  const chars = dictChars(full);

  return (
    <>
      <header
        className="sticky top-0 z-20 -mx-4 mb-4 border-b border-border-subtle bg-surface-elevated/80 px-4 py-2 backdrop-blur lg:-mx-6 lg:px-6"
        data-od-id="studio-topbar"
        data-testid="studio-topbar"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/shadowing"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-[13px] font-bold text-text-secondary hover:text-text-primary hover:border-border-subtle border border-transparent focus-visible:ring-3 ring-action-focus ring-offset-2"
          >
            <ChevronLeft size={14} strokeWidth={ICON_STROKE} /> Thư viện Shadowing
          </Link>
          <div className="min-w-0 truncate text-[13.5px] font-extrabold">
            <span className="hanzi">{video.title}</span>{" "}
            <small className="font-normal text-text-secondary">• {video.hsk} · {topicVi[video.topic]}</small>
          </div>
          <div className="ml-auto flex items-center gap-2 whitespace-nowrap text-xs font-bold text-text-secondary">
            <span>Tiến độ nói: {linesDone}/{subs.length} câu ({pct}%)</span>
            <span className="h-2 w-36 overflow-hidden rounded-full bg-ring-track">
              <i
                className="block h-full rounded-full bg-feedback-success transition-[width]"
                style={{ width: pct + "%" }}
                data-testid="studio-progress-fill"
              />
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="flex min-w-0 flex-col gap-4 lg:w-[58%]" data-od-id="media-deck">
          <section aria-label="Trình phát video">
            <div
              className="relative aspect-video max-h-[250px] w-full overflow-hidden rounded-card border border-border-subtle bg-surface-muted"
              data-od-id="video-stage"
            >
              <iframe
                id="ytplayer"
                title={"YouTube video player — " + video.title}
                src={"https://www.youtube-nocookie.com/embed/" + video.id + "?enablejsapi=1&rel=0&playsinline=1"}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              {!eng.ytReady && (
                <div
                  data-testid="video-overlay"
                  className="absolute inset-0 grid place-items-center bg-surface-muted text-center"
                >
                  <div>
                    <span className="hanzi text-7xl text-white/20">{video.title.slice(0, 2)}</span>
                    <p className="mt-2 text-sm text-text-secondary">Video YouTube — cần kết nối mạng</p>
                    {eng.tts && (
                      <p className="text-sm text-feedback-warning">Dùng TTS đọc câu — không cần mạng cũng học được.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* player toolbar */}
            <div
              className="mt-2.5 flex flex-wrap items-center gap-2 rounded-card border border-border-subtle bg-surface-elevated p-1.5 shadow-xs"
              data-od-id="player-toolbar"
              data-testid="player-toolbar"
            >
              <Button size="sm" variant="secondary" onClick={eng.togglePlay} aria-label="Phát / tạm dừng" data-play>
                {eng.playing ? <Pause size={16} strokeWidth={ICON_STROKE} /> : <Play size={16} strokeWidth={ICON_STROKE} />}
                {eng.playing ? "Tạm dừng" : "Phát"}
              </Button>
              <label className="flex min-w-[120px] flex-1 items-center gap-2 text-xs tabular-nums text-text-secondary">
                <span data-testid="t-cur">00:00</span>
                <input
                  type="range"
                  aria-label="Dòng thời gian"
                  min={0}
                  max={video.durSec}
                  defaultValue={0}
                  data-testid="scrub"
                  className="flex-1 accent-[var(--action-primary)]"
                />
                <span>{video.duration}</span>
              </label>
              <Chip tone="neutral" data-testid="pos" className="min-h-6 px-2 text-xs font-bold tabular-nums">
                Câu {eng.cur + 1}/{subs.length}
              </Chip>
              <Button
                size="sm"
                variant={eng.loop ? "primary" : "secondary"}
                onClick={eng.toggleLoop}
                aria-pressed={eng.loop}
                title="Lặp lại câu này (L)"
              >
                <Repeat size={14} strokeWidth={ICON_STROKE} /> Lặp câu
              </Button>
              <div
                role="group"
                aria-label="Tốc độ phát"
                className="flex gap-0.5 rounded-control border border-border-subtle bg-surface-muted p-0.5"
              >
                {[0.75, 0.85, 1].map((r) => (
                  <button
                    key={r}
                    onClick={() => eng.setRate(r)}
                    aria-pressed={eng.rate === r}
                    className={
                      "min-h-9 rounded-[9px] px-2.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2 " +
                      (eng.rate === r ? "bg-surface-elevated text-text-primary shadow-xs" : "text-text-secondary")
                    }
                  >
                    {r === 1 ? "1.0x" : r + "x"}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                variant={subMode !== 0 ? "primary" : "secondary"}
                onClick={() => {
                  const next = ((subMode + 1) % 3) as 0 | 1 | 2;
                  setSubMode(next);
                  toast(subMode === 0 ? "Phụ đề: chỉ chữ Hán" : next === 1 ? "Phụ đề: chỉ Pinyin" : "Phụ đề: Hán tự + Pinyin");
                }}
                aria-pressed={subMode !== 0}
                title="Phụ đề"
              >
                CC
              </Button>
            </div>
          </section>
          {/* SLOT-RECORD (Task 9): cắm waveform card + record dock vào đây (dock nhận dimmed={tab === "dict"}) */}
        </div>

        {/* ---------- SLOT-TRANSCRIPT (Task 8) ---------- */}
        <div className="flex min-w-0 flex-col gap-3 lg:w-[42%]" data-od-id="transcript-pane">
          <section
            aria-label="Kịch bản và chính tả"
            className="rounded-card border border-border-subtle bg-surface-elevated p-3.5"
          >
            {/* tabs */}
            <div role="group" aria-label="Chế độ học" data-od-id="script-tabs" className="flex gap-1 rounded-control border border-border-subtle bg-surface-muted p-0.5">
              <button
                type="button"
                onClick={() => setTab("script")}
                aria-pressed={tab === "script"}
                className={
                  "min-h-11 flex-1 rounded-[9px] px-2 text-[13px] font-bold focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2 " +
                  (tab === "script" ? "bg-surface-elevated text-text-primary shadow-xs" : "text-text-secondary")
                }
              >
                Kịch bản đồng bộ
              </button>
              <button
                type="button"
                onClick={() => setTab("dict")}
                aria-pressed={tab === "dict"}
                className={
                  "min-h-11 flex-1 rounded-[9px] px-2 text-[13px] font-bold focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2 " +
                  (tab === "dict" ? "bg-surface-elevated text-text-primary shadow-xs" : "text-text-secondary")
                }
              >
                Chép chính tả
              </button>
            </div>

            {/* transcript stream */}
            <div
              ref={streamRef}
              data-testid="transcript-stream"
              data-od-id="transcript-stream"
              hidden={tab === "dict"}
              className="mt-3 max-h-[640px] space-y-2 overflow-y-auto pr-0.5"
            >
              {subs.map((s, i) => (
                <div
                  key={i}
                  data-sent={i}
                  onClick={() => { eng.gotoSentence(i, true); eng.speakSentence(i); }}
                  className={
                    "cursor-pointer rounded-2xl border border-border-subtle p-3 transition-colors hover:bg-surface-muted " +
                    (i === eng.cur ? "sent-active" : "")
                  }
                >
                  <div className="text-[11px] font-bold tabular-nums text-text-secondary">
                    Câu {s.n} · {fmt(s.start)} – {fmt(s.end)}
                  </div>
                  <div className="mt-1 flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className={"zh font-semibold " + (i === eng.cur ? "text-xl" : "text-lg")} data-zh>
                        {s.parts.map((p, pi) => (
                          <span key={pi} data-part={pi}>{p.zh}</span>
                        ))}
                      </div>
                      {s.pinyin && (
                        <p
                          data-py
                          className={(subMode === 0 ? "hidden " : "") + "mt-1 text-sm italic text-action-primary"}
                        >
                          {s.pinyin}
                        </p>
                      )}
                      {s.vi && (
                        <p
                          data-vi
                          className={(subMode !== 2 ? "hidden " : "") + "mt-1 text-sm text-text-secondary"}
                        >
                          {s.vi}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={"Nghe câu " + s.n}
                      title="Nghe câu này"
                      onClick={(e) => { e.stopPropagation(); eng.speakSentence(i); }}
                      className="grid size-[34px] shrink-0 place-items-center rounded-full border border-border-subtle bg-surface-elevated text-text-secondary hover:text-action-primary focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
                    >
                      <Volume2 size={15} strokeWidth={ICON_STROKE} />
                    </button>
                  </div>
                  <div className="mt-2">
                    {rec?.score ? (
                      <Chip tone="correct" className="min-h-6 px-2 text-[11px] font-bold">{rec.score}%</Chip>
                    ) : (
                      <Chip tone="neutral" className="min-h-6 px-2 text-[11px] font-bold">Chưa luyện</Chip>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* dictation box */}
            <div
              data-testid="dict-box"
              data-od-id="dictation-box"
              hidden={tab === "script"}
              className="mt-3 space-y-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-extrabold tracking-wide">CÂU {eng.cur + 1} / {subs.length}</p>
                <small className="text-xs tabular-nums text-text-secondary">
                  Mốc thời gian {fmt(curSub?.start ?? 0)} – {fmt(curSub?.end ?? 0)}
                </small>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" size="sm" data-testid="dict-listen" onClick={eng.listenCurrent}>
                  <Volume2 size={14} strokeWidth={ICON_STROKE} /> Nghe câu mẫu
                </Button>
                <Button variant="secondary" size="sm" data-testid="dict-slow" onClick={() => speak(full, { lang: "zh-CN", rate: 0.65 })}>
                  Nghe chậm 0.65x
                </Button>
              </div>

              {/* gợi ý ô trống */}
              <div className="rounded-2xl border border-border-subtle bg-surface-muted p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-extrabold tracking-wider text-text-secondary">GỢI Ý Ô TRỐNG</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    data-testid="dict-hint"
                    onClick={() => {
                      if (dictShown >= chars.length) { toast("Đã hiện hết gợi ý rồi"); return; }
                      setDictShown((n) => n + 1);
                    }}
                  >
                    Gợi ý 1 chữ
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {chars.map((c, ci) => (
                    <span
                      key={ci}
                      className={
                        "grid h-9 w-9 place-items-center rounded-lg border text-lg " +
                        (ci < dictShown
                          ? "hanzi border-border-subtle bg-surface-elevated"
                          : "border-dashed border-border-subtle text-text-secondary")
                      }
                    >
                      {ci < dictShown ? c : "?"}
                    </span>
                  ))}
                </div>
                {dictShown >= 1 && curSub?.pinyin && (
                  <p className="mt-2 text-xs italic text-text-secondary">Gợi ý: {curSub.pinyin.slice(0, hintLen)}…</p>
                )}
              </div>

              <textarea
                data-testid="dict-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); check(); } }}
                placeholder="Gõ những gì bạn nghe được (chữ Hán hoặc pinyin)"
                rows={3}
                className="zh text-lg min-h-24 rounded-2xl bg-surface-muted p-3.5 w-full border border-border-subtle text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
              />

              <Button variant="primary" onClick={check} data-testid="dict-check" className="w-full">
                Kiểm tra đáp án
              </Button>

              <div className="flex gap-2">
                <Button variant="secondary" size="sm" data-testid="dict-prev" onClick={eng.prev}>◀ Câu trước</Button>
                <Button variant="secondary" size="sm" data-testid="dict-skip" onClick={eng.next} className="ml-auto">
                  Bỏ qua / Tiếp ▶
                </Button>
              </div>

              <div data-testid="dict-result">
                {result?.kind === "empty" && <p className="text-sm text-text-secondary">Hãy gõ những gì bạn nghe được trước đã.</p>}
                {result?.kind === "correct" && (
                  <p className="font-bold text-feedback-success">
                    Chính xác!{curSub?.pinyin ? <span className="italic"> {curSub.pinyin}</span> : null}
                  </p>
                )}
                {result?.kind === "wrong" && (
                  <p className="font-bold text-feedback-error">Chưa đúng — nghe lại và thử tiếp nhé (đáp án vẫn đang ẩn)</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
