"use client";
/* Library /shadowing — port shadow-header / daily-pick / filter-toolbar / video-grid
   của shadowing.html (spec 2026-10-05). Server serialize videos + subtitles vào props. */
import { useMemo, useState } from "react";
import { topicVi, type ShadowingVideo, type SubtitleSentence, type ShadowingTopic } from "@/content/shadowing";
import { pickDaily, syntheticLines } from "@/lib/shadowing/daily";
import { useShadowingProgress } from "@/lib/shadowing/use-shadowing-progress";
import { useTts } from "@/lib/tts/use-tts";
import { useToast } from "@/components/shell/toast-provider";
import { ShadowingDrawer } from "./shadowing-drawer";
import { PracticeOverlay } from "./practice-overlay";
import { Button } from "@/components/ui/button";
import { Play } from "@/components/ui/icon";

type Props = { videos: ShadowingVideo[]; subtitlesByVideo: Record<string, SubtitleSentence[]> };

const LEVELS = ["Tất cả", "HSK 1", "HSK 2", "HSK 3", "HSK 4-6"] as const;
const SPEEDS = ["Tất cả", "Chậm · dễ nghe", "Tự nhiên · bản xứ"] as const;
const TOPIC_ORDER: ShadowingTopic[] = ["life", "food", "travel", "film"];

/* "HSK 1" → "HSK1"; "HSK 4-6" → nhóm 4/5/6 */
function levelMatches(hsk: string, level: string): boolean {
  if (level === "Tất cả") return true;
  if (level === "HSK 4-6") return ["HSK4", "HSK5", "HSK6"].includes(hsk);
  return hsk === level.replace(" ", "");
}

function pillClasses(active: boolean): string {
  return [
    "rounded-full border px-3 min-h-11 inline-flex items-center font-bold text-[12.5px] transition",
    "focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2",
    active
      ? "bg-text-primary text-surface-paper border-transparent"
      : "border-border-default text-text-secondary hover:border-border-strong hover:text-text-primary",
  ].join(" ");
}

function SegRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] font-extrabold tracking-wider text-text-secondary min-w-16 uppercase">{label}</span>
      {children}
    </div>
  );
}

export default function ShadowingLibrary({ videos, subtitlesByVideo }: Props) {
  const { metrics, progressMap } = useShadowingProgress();
  const { speak } = useTts();
  const toast = useToast();

  const [level, setLevel] = useState<string>("Tất cả");
  const [topic, setTopic] = useState<string>("Tất cả");
  const [speed, setSpeed] = useState<string>("Tất cả");
  const [q, setQ] = useState("");
  // SLOT-DRAWER / SLOT-OVERLAY (Task 11): drawerVideo + practiceVideo state giữ sẵn,
  // render ShadowingDrawer / PracticeOverlay sẽ được nối ở Task 11.
  const [drawerVideo, setDrawerVideo] = useState<ShadowingVideo | null>(null);
  const [practiceVideo, setPracticeVideo] = useState<ShadowingVideo | null>(null);

  const daily = useMemo(() => pickDaily(videos, subtitlesByVideo, new Date()), [videos, subtitlesByVideo]);

  const linesOf = (v: ShadowingVideo): SubtitleSentence[] => subtitlesByVideo[v.id] ?? syntheticLines(v);
  const dailyLines = linesOf(daily);
  const firstDaily = dailyLines[0];
  const firstZh = firstDaily.parts.map((p) => p.zh).join("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return videos.filter((v) => {
      if (!levelMatches(v.hsk, level)) return false;
      if (topic !== "Tất cả" && topicVi[v.topic] !== topic) return false;
      if (speed === "Chậm · dễ nghe" && v.spd > 0.85) return false;
      if (speed === "Tự nhiên · bản xứ" && v.spd <= 0.85) return false;
      if (needle) {
        const lines = linesOf(v);
        const hay = [v.title, lines[0]?.pinyin ?? "", lines[0]?.vi ?? ""].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, level, topic, speed, q, subtitlesByVideo]);

  const practiceMinutes = Math.max(1, Math.round(dailyLines.length / 4));

  const previewFirst = (v: ShadowingVideo) => {
    const lines = linesOf(v);
    speak(lines[0].parts.map((p) => p.zh).join(""), { rate: 0.8 });
    toast("Phát thử · 0.8x");
  };

  const topics = ["Tất cả", ...TOPIC_ORDER.map((t) => topicVi[t])];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 flex flex-col gap-5">
      {/* ── shadow-header ─────────────────────────────────────────── */}
      <header data-od-id="shadow-header" data-testid="shadow-header" className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight">
            <span className="hanzi text-action-primary">影子跟读</span> · Shadowing Studio
          </h1>
          <p className="text-[13.5px] text-text-secondary mt-0.5">
            Luyện ngữ điệu, phản xạ nghe nói và cảm thức ngôn ngữ qua ngữ cảnh thực tế
          </p>
        </div>
        <div data-od-id="shadow-metrics" className="flex items-center gap-2 flex-wrap">
          <span className="rounded-full border border-feedback-success bg-jade-wash text-feedback-success px-3.5 py-[7px] text-[12.5px] font-extrabold inline-flex items-center gap-1.5">
            {metrics.practiced} bài đã luyện
          </span>
          <span className="rounded-full border border-feedback-warning bg-amber-wash text-amber-ink px-3.5 py-[7px] text-[12.5px] font-extrabold inline-flex items-center gap-1.5">
            {Math.round(metrics.seconds / 60)} phút nói
          </span>
          <span className="rounded-full border border-action-primary bg-rose-wash text-action-primary px-3.5 py-[7px] text-[12.5px] font-extrabold inline-flex items-center gap-1.5">
            {metrics.avgScore ?? "—"}% chuẩn ngữ điệu
          </span>
        </div>
      </header>

      {/* ── daily-pick hero ───────────────────────────────────────── */}
      <section
        data-od-id="daily-pick"
        data-testid="daily-pick"
        className="rounded-[20px] border border-border-default bg-surface-elevated shadow-xs p-5 grid lg:grid-cols-[2fr_3fr] gap-5 items-center"
      >
        <div
          className="hz-thumb-gradient aspect-video rounded-[14px] relative overflow-hidden cursor-pointer group"
          onClick={() => previewFirst(daily)}
        >
          <span className="hanzi absolute inset-0 flex items-center justify-center text-8xl text-white/20 select-none pointer-events-none">
            {daily.title.slice(0, 2)}
          </span>
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-12 w-12 rounded-full bg-white/25 flex items-center justify-center text-white transition group-hover:scale-110">
              <Play className="size-5 ml-0.5" />
            </span>
          </span>
          <span className="absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[11px] font-bold text-white">
            {daily.duration}
          </span>
          <span className="absolute top-2 right-2 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-bold text-white">
            {daily.spd <= 0.85 ? `Tốc độ ${daily.spd}x · Dễ nghe` : "Tự nhiên"}
          </span>
        </div>
        <div className="flex flex-col gap-2.5 min-w-0">
          <span className="self-start rounded-full bg-surface-muted border border-border-default px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-text-secondary uppercase">
            {topicVi[daily.topic].toUpperCase()}
          </span>
          <h2 className="hanzi text-xl font-extrabold leading-snug line-clamp-2">{daily.title}</h2>
          <p className="text-[13px] text-text-secondary">
            {firstDaily.pinyin} · {daily.hsk} · {daily.duration}
          </p>
          {firstDaily.vi && <p className="text-[13.5px] text-text-secondary">{firstDaily.vi}</p>}
          <div className="bg-surface-muted rounded-xl border border-border-default p-2.5 text-[13px] text-text-secondary">
            Mẫu câu chính: <b className="hanzi text-action-primary font-extrabold">{firstZh}</b>
          </div>
          <div className="pt-1">
            <Button
              size="lg"
              className="w-full sm:w-auto rounded-2xl min-h-[52px]"
              onClick={() => setPracticeVideo(daily)} // SLOT-OVERLAY (Task 11)
            >
              Bắt đầu luyện nói ngay ({practiceMinutes} phút)
            </Button>
          </div>
        </div>
      </section>

      {/* ── filter-toolbar ────────────────────────────────────────── */}
      <div data-od-id="filter-toolbar" className="rounded-card border border-border-default bg-surface-elevated shadow-xs p-3 flex flex-col gap-2">
        <SegRow label="Cấp độ">
          <div role="group" aria-label="Lọc theo cấp độ" className="flex gap-2 flex-wrap">
            {LEVELS.map((lv) => (
              <button key={lv} aria-pressed={level === lv} className={pillClasses(level === lv)} onClick={() => setLevel(lv)}>
                {lv}
              </button>
            ))}
          </div>
        </SegRow>
        <SegRow label="Chủ đề">
          <div role="group" aria-label="Lọc theo chủ đề" className="flex gap-2 flex-wrap">
            {topics.map((tp) => (
              <button key={tp} aria-pressed={topic === tp} className={pillClasses(topic === tp)} onClick={() => setTopic(tp)}>
                {tp}
              </button>
            ))}
          </div>
        </SegRow>
        <div className="flex items-center gap-2 flex-wrap">
          <SegRow label="Tốc độ">
            <div role="group" aria-label="Lọc theo tốc độ" className="flex gap-2 flex-wrap">
              {SPEEDS.map((sp) => (
                <button key={sp} aria-pressed={speed === sp} className={pillClasses(speed === sp)} onClick={() => setSpeed(sp)}>
                  {sp}
                </button>
              ))}
            </div>
          </SegRow>
          <div className="ml-auto rounded-full border border-border-default bg-surface-muted h-10 min-h-11 px-3.5 flex items-center gap-2 min-w-[190px]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 text-text-secondary shrink-0" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              aria-label="Tìm video"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm video…"
              className="bg-transparent outline-none text-[13px] w-full placeholder:text-text-secondary"
            />
          </div>
        </div>
      </div>

      {/* ── video-grid ────────────────────────────────────────────── */}
      <div data-od-id="video-grid" data-testid="video-grid" className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((v) => {
          const lines = linesOf(v);
          const rec = progressMap[v.id];
          return (
            <button
              key={v.id}
              data-od-id={"video-" + v.id}
              onClick={() => setDrawerVideo(v)} // SLOT-DRAWER (Task 11)
              className="text-left rounded-card border border-border-default bg-surface-elevated shadow-xs overflow-hidden transition hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
            >
              <div className="hz-thumb-gradient aspect-video relative overflow-hidden">
                <span className="hanzi absolute inset-0 flex items-center justify-center text-5xl text-white/20 select-none pointer-events-none">
                  {v.title.slice(0, 2)}
                </span>
                <span className="absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {v.duration}
                </span>
              </div>
              <div className="p-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[12px] text-text-secondary">
                  <span className="rounded border border-action-primary text-action-primary text-[11px] font-bold px-1.5 py-0.5">
                    {v.hsk}
                  </span>
                  <span>Tốc độ {v.spd.toFixed(1)}x</span>
                </div>
                <h3 className="hanzi text-lg font-extrabold leading-snug line-clamp-2">{v.title}</h3>
                {lines[0]?.vi && <p className="text-[13px] text-text-secondary line-clamp-1">{lines[0].vi}</p>}
                <div className="flex items-center justify-between gap-2 pt-1.5">
                  <span className="text-[12px] text-text-secondary">
                    {lines.length} câu hội thoại · {topicVi[v.topic]}
                  </span>
                  <StatusPill rec={rec} total={lines.length} />
                </div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full py-7 text-center text-[13.5px] text-text-secondary">Không có video nào khớp bộ lọc.</p>
        )}
      </div>

      {/* ── script-drawer / practice-session (Task 11) ────────────── */}
      {drawerVideo && (
        <ShadowingDrawer video={drawerVideo} lines={linesOf(drawerVideo)} onClose={() => setDrawerVideo(null)} />
      )}
      {practiceVideo && (
        <PracticeOverlay video={practiceVideo} lines={linesOf(practiceVideo)} onClose={() => setPracticeVideo(null)} />
      )}
    </div>
  );
}

function StatusPill({
  rec,
  total,
}: {
  rec?: { status: string; score: number | null; linesDone: number };
  total: number;
}) {
  const base = "rounded-full border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap";
  if (rec?.status === "done")
    return (
      <span className={`${base} border-feedback-success bg-jade-wash text-feedback-success`}>
        Đã hoàn thành · {rec.score ?? 0}%
      </span>
    );
  if (rec?.status === "mid")
    return (
      <span className={`${base} border-feedback-warning bg-amber-wash text-amber-ink`}>
        Đang luyện · {Math.min(rec.linesDone, total)}/{total} câu
      </span>
    );
  return <span className={`${base} border-border-default bg-surface-muted text-text-secondary`}>Chưa học</span>;
}
