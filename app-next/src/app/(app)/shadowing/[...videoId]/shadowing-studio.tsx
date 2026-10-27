"use client";
/* ShadowingStudio (port shadowing-video.html) — engine dùng usePlayerEngine;
   ghi chú: nút Ẩn video, checkbox show-vi/py, Cài đặt của player cũ bị bỏ theo mock. */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactPlayer from "react-player";
import { usePlayerEngine } from "@/components/shadowing/studio/use-player-engine";
import { useRecorder } from "@/lib/shadowing/use-recorder";
import { barHeights } from "@/lib/shadowing/waveform";
import { scoreFor, toneChipsFor } from "@/lib/shadowing/scoring";
import { useShadowingProgress } from "@/lib/shadowing/use-shadowing-progress";
import { getAutoscroll } from "@/lib/shadowing/prefs";
import { activeWordIndex } from "@/lib/shadowing/auto-pause";
import type { ShadowingVideo, SubtitleSentence } from "@/content/shadowing";
import { topicVi } from "@/content/shadowing";
import { dialogueByLesson, type DialogueRecord } from "@/content/dialogues";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useToast } from "@/components/shell/toast-provider";
import { Volume2, Play, Pause, Repeat, ChevronLeft, Mic, ICON_STROKE } from "@/components/ui/icon";
import DictationPanel from "./dictation-panel";
import PronPanel from "./pron-panel";

/* mm:ss — hàng "Câu {n} · {start} – {end}" của transcript */
function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.round(t % 60);
  return m + ":" + String(s).padStart(2, "0");
}

/* Karaoke (Task 10): index từ đang phát tại tSec trong câu s — -1 nếu
   không có words hoặc ngoài mọi khoảng. Pure, top-level để dễ test. */
function activeIdx(s: SubtitleSentence, tSec: number): number {
  if (!s.words || s.words.length === 0) return -1;
  return activeWordIndex(s.words, tSec * 1000);
}

/* Vẽ dãy bar giả lên canvas — port drawBars() của mock; roundRect nếu có, fallback rect */
function drawBars(canvas: HTMLCanvasElement, heights: number[], color: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = color;
  const bw = W / heights.length;
  heights.forEach((h, i) => {
    const bh = 6 + h * (H * 0.72);
    const x = i * bw + bw * 0.2;
    const y = (H - bh) / 2;
    const w = bw * 0.6;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(x, y, w, bh, 3);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, w, bh);
    }
  });
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
  /* ---------- T7 — chế độ audio: engine điều khiển <audio id="audioplayer">,
     src clip theo câu hiện tại; audioSrcs undefined → YouTube giữ nguyên. ---------- */
  const audioDir = video.type === "audio" ? video.audioDir : null;
  const isAudio = !!audioDir;
  const audioSrcs = audioDir ? subs.map((s) => `/${audioDir}-${s.n}.mp3`) : undefined;
  const playerRef = useRef<HTMLMediaElement | null>(null);
  // origin đọc sau mount (hydration-safe) — config.youtube.origin phục vụ postMessage
  const [windowOrigin, setWindowOrigin] = useState<string | undefined>(undefined);
  useEffect(() => setWindowOrigin(window.location.origin), []);
  const eng = usePlayerEngine({ subs, postSink: enginePostSink, audioSrcs, playerRef });
  const [audioMissing, setAudioMissing] = useState(false);
  useEffect(() => { setAudioMissing(false); }, [eng.cur]);
  // vai A/B trong transcript (hội thoại theo bài) — map rỗng → không label
  const dialogue = isAudio
    ? (dialogueByLesson as unknown as Record<string, DialogueRecord | undefined>)[video.id]
    : undefined;
  const toast = useToast();
  const { progressMap, recordPractice } = useShadowingProgress();
  const prog = progressMap[video.id];
  const [subMode, setSubMode] = useState<0 | 1 | 2>(2); // 0: chỉ hanzi, 1: chỉ pinyin, 2: cả hai
  // mode cột phải — đặt ở level component để record dock nhận dimmed={mode === "dict"};
  // pron dùng mic nên không mờ (Task 9 thay panel pron)
  const [mode, setMode] = useState<"shadow" | "dict" | "pron">("shadow");
  const dimmed = mode === "dict";

  /* ---------- SLOT-RECORD: recorder + chấm điểm (port waveform-card/record-dock) ---------- */
  const [level, setLevel] = useState(0);
  const rec = useRecorder(setLevel);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastRatio, setLastRatio] = useState(0);
  useEffect(() => { setLastScore(null); setLastRatio(0); }, [eng.cur]);

  const nativeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (nativeCanvasRef.current) drawBars(nativeCanvasRef.current, barHeights(eng.cur + 3, 1), getComputedStyle(document.documentElement).getPropertyValue("--hz-text-secondary") || "currentColor");
  }, [eng.cur]);
  useEffect(() => {
    if (mineCanvasRef.current && rec.lastUrl != null) {
      drawBars(mineCanvasRef.current, barHeights(eng.cur * 7 + 2, 0.55 + lastRatio * 0.4), getComputedStyle(document.documentElement).getPropertyValue("--hz-action-primary") || "currentColor");
    }
  }, [eng.cur, rec.lastUrl, lastRatio]);

  const onStop = useCallback(() => {
    const r = rec.stop();
    if (!r) return;
    const zh = subs[eng.cur].parts.map((p) => p.zh).join(" ");
    const score = scoreFor(r.secs, zh.length, eng.rate, rec.simMode);
    setLastScore(score);
    setLastRatio(Math.min(1, r.secs / Math.max(2, (zh.length * 0.55) / eng.rate)));
    recordPractice(video.id, { score, secondsDelta: Math.round(r.secs), linesDoneDelta: 1 });
    toast("Đã chấm câu " + (eng.cur + 1) + ": " + score + "% (theo nhịp & độ dài bản ghi)");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.stop, rec.simMode, eng.cur, eng.rate, video.id, toast]);

  /* Space giữ để thu — đăng ký ở component (KHÔNG ở engine); onStop qua ref
     để keyup luôn gọi bản mới nhất dù effect không chạy lại. */
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && ((t.matches?.("input, textarea, select") ?? false) || t.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || isTyping(e)) return;
      e.preventDefault();
      if (!dimmed) rec.start();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTyping(e)) return;
      e.preventDefault();
      onStopRef.current();
    };
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimmed, rec.start]);

  /* Digit1/2/3 đổi mode học (shadow/dict/pron) — cùng guard isTyping như Space */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ((t.matches?.("input, textarea, select") ?? false) || t.isContentEditable)) return;
      if (e.code === "Digit1") setMode("shadow");
      else if (e.code === "Digit2") setMode("dict");
      else if (e.code === "Digit3") setMode("pron");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const linesDone = prog?.linesDone ?? 0;
  const pct = subs.length > 0 ? Math.round((linesDone / subs.length) * 100) : 0;

  /* ---------- transcript: autoscroll câu active theo pref (port renderActive) ---------- */
  const streamRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (mode !== "shadow" || !getAutoscroll()) return;
    const el = streamRef.current?.querySelector(`[data-sent="${eng.cur}"]`);
    try { el?.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch { /* jsdom */ }
  }, [eng.cur, mode]);

  /* ---------- dictation — DictationPanel (Task 7, variant typing; Task 8 thêm arrange) ---------- */
  const curSub = subs[Math.min(eng.cur, subs.length - 1)] ?? subs[0];
  const chips = toneChipsFor(lastScore ?? -1, (curSub?.parts ?? []).map((p) => p.zh));

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
              {isAudio ? (
                <>
                  <audio
                    id="audioplayer"
                    data-testid="audio-player"
                    src={audioSrcs?.[eng.cur]}
                    preload="auto"
                    className="hidden"
                    onError={() => setAudioMissing(true)}
                  />
                  <div className="grid h-full place-items-center text-center">
                    <div>
                      <span className="hanzi text-6xl text-white/25">{video.title.slice(0, 2)}</span>
                      <p className="mt-2 text-sm font-bold text-text-primary">Audio hội thoại</p>
                      <p className="text-xs text-text-secondary">Bản xứ: mp3 Kokoro theo từng câu</p>
                      {audioMissing && (
                        <p data-testid="audio-missing" className="mt-2 text-xs text-feedback-warning">
                          Audio đang được tạo — bạn vẫn luyện bằng TTS hoặc tự đọc theo transcript.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <ReactPlayer
                    ref={playerRef as unknown as React.Ref<HTMLVideoElement>}
                    src={"https://www.youtube-nocookie.com/embed/" + video.id + "?rel=0"}
                    playing={eng.playing}
                    playbackRate={eng.rate}
                    playsInline
                    config={windowOrigin ? { youtube: { origin: windowOrigin, rel: 0 } } : undefined}
                    onReady={eng.markYtReady}
                    onError={eng.handlePlayerError}
                    onPlay={() => eng.syncPlaying(true)}
                    onPause={() => eng.syncPlaying(false)}
                    fallback={<div className="h-full w-full animate-pulse bg-surface-muted" />}
                    style={{ width: "100%", height: "100%" }}
                  />
                  {eng.playerError && (
                    <div
                      data-testid="video-error"
                      className="absolute inset-0 grid place-items-center bg-surface-muted p-4 text-center"
                    >
                      <div>
                        <p className="text-sm font-bold text-feedback-error">Không phát được video trên trang.</p>
                        <a
                          href={"https://www.youtube.com/watch?v=" + video.id}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-bold text-action-primary underline"
                        >
                          Mở video trên YouTube ↗
                        </a>
                      </div>
                    </div>
                  )}
                  {!eng.ytReady && !eng.playerError && (
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
                </>
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
              {subs.some((s) => s.words) && (
                <Button
                  size="sm"
                  variant={eng.autoPause ? "primary" : "secondary"}
                  onClick={() => eng.setAutoPause(!eng.autoPause)}
                  aria-pressed={eng.autoPause}
                  data-testid="auto-pause"
                  title="Tự ngắt cuối câu theo word timing"
                >
                  Tự ngắt
                </Button>
              )}
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
          {/* SLOT-RECORD: waveform card + tone inspector + record dock */}
          <section
            aria-label="Sóng âm và chấm điểm"
            data-od-id="waveform-card"
            data-testid="waveform-card"
            className="rounded-card border border-border-subtle bg-surface-elevated p-4 shadow-xs"
          >
            <h3 className="text-[13px] font-bold">Sóng âm đối chiếu</h3>

            {/* hàng 1 — bản xứ */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-text-secondary">Bản xứ</span>
              <button
                type="button"
                onClick={() => eng.speakSentence(eng.cur)}
                className="min-h-9 rounded-control border border-border-subtle bg-surface-elevated px-3 text-xs font-bold text-text-primary hover:border-border-default focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
              >
                Nghe mẫu
              </button>
            </div>
            <canvas
              ref={nativeCanvasRef}
              data-testid="wave-native"
              width={600}
              height={80}
              className="mt-1.5 h-8 w-full rounded-[10px] border border-border-subtle bg-surface-muted"
            />

            {/* hàng 2 — giọng của bạn */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-text-secondary">Giọng của bạn</span>
              <button
                type="button"
                onClick={() => {
                  if (rec.lastUrl == null) { toast("Chưa có bản ghi để phát lại"); return; }
                  new Audio(rec.lastUrl).play().catch(() => { /* silent */ });
                }}
                className="min-h-9 rounded-control border border-border-subtle bg-surface-elevated px-3 text-xs font-bold text-text-primary hover:border-border-default focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
              >
                Phát lại
              </button>
            </div>
            <div className="relative mt-1.5">
              <canvas
                ref={mineCanvasRef}
                data-testid="wave-mine"
                width={600}
                height={80}
                className="h-8 w-full rounded-[10px] border border-border-subtle bg-surface-muted"
              />
              {rec.lastUrl == null && (
                <div
                  data-testid="wave-mine-empty"
                  className="absolute inset-0 grid place-items-center rounded-[10px] bg-surface-muted px-2 text-center text-[11px] text-text-secondary"
                >
                  Chưa có bản ghi — nhấn giữ mic để thu âm câu {eng.cur + 1}
                </div>
              )}
            </div>

            {/* tone inspector */}
            <div data-od-id="tone-inspector" className="mt-3 border-t border-border-subtle pt-3">
              <h3 className="text-[13px] font-bold">Chấm điểm thanh điệu câu này</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chips.map((c, i) =>
                  lastScore == null ? (
                    <Chip key={i} tone="neutral" className="min-h-7 px-2 text-[11px]">
                      <b className="hanzi">{c.zh}</b>
                    </Chip>
                  ) : (
                    <Chip
                      key={i}
                      className={
                        "min-h-7 px-2 text-[11px] font-bold " +
                        (c.ok
                          ? "border-feedback-success bg-jade-wash text-feedback-success"
                          : "border-amber-wash bg-amber-wash text-amber-ink")
                      }
                    >
                      <span className="hanzi">{c.zh}</span>
                      {c.ok ? " ✓" : " ~"}
                    </Chip>
                  ),
                )}
              </div>
              <div className="mt-2.5">
                {lastScore == null ? (
                  <span
                    data-testid="tone-score"
                    className="inline-flex items-center rounded-[12px] border border-border-subtle bg-surface-muted px-3.5 py-2 text-[13px] font-extrabold text-text-secondary"
                  >
                    Chưa chấm — hãy thu âm câu này
                  </span>
                ) : lastScore < 70 ? (
                  <span
                    data-testid="tone-score"
                    className="inline-flex items-center rounded-[12px] border border-amber-wash bg-amber-wash px-3.5 py-2 text-[13px] font-extrabold text-amber-ink"
                  >
                    Khớp nhịp nói: {lastScore}% · Cần luyện thêm
                  </span>
                ) : lastScore < 85 ? (
                  <span
                    data-testid="tone-score"
                    className="inline-flex items-center rounded-[12px] border border-amber-wash bg-amber-wash px-3.5 py-2 text-[13px] font-extrabold text-amber-ink"
                  >
                    Khớp nhịp nói: {lastScore}% · Khá tốt
                  </span>
                ) : (
                  <span
                    data-testid="tone-score"
                    className="inline-flex items-center rounded-[12px] border border-feedback-success bg-jade-wash px-3.5 py-2 text-[13px] font-extrabold text-feedback-success"
                  >
                    Khớp nhịp nói: {lastScore}% · Rất tốt!
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* record dock */}
          <section
            aria-label="Đế thu âm"
            data-od-id="record-dock"
            data-testid="record-dock"
            className={
              "rounded-card border border-border-subtle bg-surface-elevated p-2 text-center shadow-xs" +
              (dimmed ? " opacity-45 saturate-50 pointer-events-none" : "")
            }
          >
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                data-testid="mic-btn"
                aria-pressed={rec.recording}
                aria-label="Nhấn giữ để thu âm"
                onPointerDown={(e) => { e.preventDefault(); if (!dimmed) rec.start(); }}
                onPointerUp={onStop}
                onPointerLeave={onStop}
                onPointerCancel={onStop}
                className="relative grid size-14 touch-none select-none place-items-center rounded-full bg-action-primary text-white shadow-md transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
              >
                {rec.recording && (
                  <span aria-hidden className="absolute inset-0 animate-ping rounded-full border-2 border-action-primary" />
                )}
                <Mic size={24} strokeWidth={ICON_STROKE} />
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-text-secondary">
              Nhấn giữ để nói (hoặc giữ <kbd className="rounded border border-border-subtle bg-surface-muted px-1 font-bold">Space</kbd>)
            </p>
            <div className="mx-auto mt-2 h-1.5 max-w-[260px] overflow-hidden rounded-full bg-ring-track" aria-hidden>
              <i className="block h-full rounded-full bg-action-primary transition-[width]" style={{ width: Math.round(level * 100) + "%" }} />
            </div>
            <div className="mt-2 flex gap-2">
              <Button variant="secondary" size="sm" onClick={eng.prev} className="min-h-12 flex-1">◀ Câu trước</Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { eng.next(); eng.speakSentence(Math.min(eng.cur + 1, subs.length - 1)); }}
                className="min-h-12 flex-1"
              >
                Câu tiếp theo ▶
              </Button>
            </div>
          </section>
        </div>

        {/* ---------- SLOT-TRANSCRIPT (Task 8) ---------- */}
        <div className="flex min-w-0 flex-col gap-3 lg:w-[42%]" data-od-id="transcript-pane">
          <section
            aria-label="Kịch bản và chính tả"
            className="rounded-card border border-border-subtle bg-surface-elevated p-3.5"
          >
            {/* mode tabs — Shadow / Chép chính tả / Phát âm (phím Digit1/2/3) */}
            <div role="group" aria-label="Chế độ học" data-od-id="mode-tabs" className="flex gap-1 rounded-control border border-border-subtle bg-surface-muted p-0.5">
              {([
                ["mode-shadow", "shadow", "Shadow"],
                ["mode-dict", "dict", "Chép chính tả"],
                ["mode-pron", "pron", "Phát âm"],
              ] as const).map(([tid, m, label]) => (
                <button
                  key={tid}
                  type="button"
                  data-testid={tid}
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={
                    "min-h-11 flex-1 rounded-[9px] px-2 text-[13px] font-bold focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2 " +
                    (mode === m ? "bg-surface-elevated text-text-primary shadow-xs" : "text-text-secondary")
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {/* transcript stream */}
            <div
              ref={streamRef}
              data-testid="transcript-stream"
              data-od-id="transcript-stream"
              hidden={mode !== "shadow"}
              className="mt-3 max-h-[640px] space-y-2 overflow-y-auto pr-0.5"
            >
              {subs.map((s, i) => {
                const speaker = dialogue?.lines.find((l) => l.n === s.n)?.speaker;
                const karaoke = !!s.words && s.words.length > 0 && i === eng.cur;
                const ai = karaoke ? activeIdx(s, eng.time) : -1;
                return (
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
                    {speaker && (
                      <span
                        data-testid="speaker-label"
                        className={"ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold " +
                          (speaker === "A" ? "bg-jade-wash text-feedback-success" : "bg-amber-wash text-amber-ink")}
                      >
                        Vai {speaker}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className={"zh font-semibold " + (i === eng.cur ? "text-xl" : "text-lg")} data-zh>
                        {karaoke
                          ? s.words!.map((w, wi) => (
                              <span
                                key={wi}
                                data-testid="kw"
                                data-word={wi}
                                data-active={wi === ai ? "1" : "0"}
                                className={wi === ai ? "rounded bg-jade-wash text-action-primary" : ""}
                              >
                                {w.zh}
                              </span>
                            ))
                          : s.parts.map((p, pi) => (
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
                    {prog?.score ? (
                      <Chip tone="correct" className="min-h-6 px-2 text-[11px] font-bold">{prog.score}%</Chip>
                    ) : (
                      <Chip tone="neutral" className="min-h-6 px-2 text-[11px] font-bold">Chưa luyện</Chip>
                    )}
                  </div>
                </div>
                );
              })}
            </div>

            {/* dictation — DictationPanel (testid dict-box nằm trong panel) */}
            <DictationPanel
              subs={subs}
              cur={eng.cur}
              videoId={video.id}
              eng={{ cur: eng.cur, listenCurrent: eng.listenCurrent, prev: eng.prev, next: eng.next }}
              recordPractice={recordPractice}
              hidden={mode !== "dict"}
            />

            {/* pron — PronPanel (Task 9): transcript thu gọn + ghi âm chấm điểm; record dock giữ nguyên cho mode shadow */}
            {mode === "pron" && (
              <PronPanel
                subs={subs}
                cur={eng.cur}
                rate={eng.rate}
                videoId={video.id}
                recordPractice={recordPractice}
              />
            )}
          </section>
        </div>
      </div>
    </>
  );
}
