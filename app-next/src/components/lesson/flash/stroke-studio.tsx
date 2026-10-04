"use client";

/* Stroke Studio — sheet nét chữ & bút thuận (port section[data-od-id="stroke-modal"]
   của opendesign lesson.html). Data nét: HanziWriter.loadCharacterData (CDN, cache);
   render + hoạt họa dashoffset port 1:1 từ mockup để giữ trạng thái todo/done/now per nét.
   Tự luyện viết: SVG polyline pointer events (port inkSvg của mockup). */

import { useCallback, useEffect, useRef, useState } from "react";
import HanziWriter from "hanzi-writer";
import { hanziChars } from "@/content/hanzi";
import { useTts } from "@/lib/tts/use-tts";
import { useToastSafe } from "@/components/shell/toast-provider";
import { ICON_STROKE, PenTool, RotateCcw, Volume2, X } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const SPEEDS = [0.75, 1, 1.5] as const;

/* Mẹo ghi nhớ per-char (port STROKE_DATA.*.tip của mockup — chỉ 2 chữ demo có data) */
const TIPS: Record<string, string> = {
  "爱": "Phía trên là móng vuốt (爫), phía dưới là bạn bè (友) che chở — yêu (爱) là nâng niu, che chở.",
  "好": "Người phụ nữ (女) bên đứa trẻ (子) — điều tốt đẹp (好). Trong 爱好 đọc là hào (sở thích).",
};

type CharData = { strokes: string[]; medians: number[][][] };

const toolBtn =
  "inline-flex min-h-11 items-center gap-1.5 rounded-[16px] border border-border-default bg-surface-elevated px-3.5 text-[12.5px] font-bold text-text-primary transition hover:-translate-y-px disabled:pointer-events-none disabled:opacity-50";

export function StrokeStudio({
  open,
  onClose,
  word,
  pinyin,
  className,
}: {
  open: boolean;
  onClose: () => void;
  word: string;
  pinyin?: string;
  className?: string;
}) {
  const { speak } = useTts();
  const toast = useToastSafe();

  const chars = Array.from(new Set(Array.from(word.replace(/\s+/g, ""))));
  const [cur, setCur] = useState(chars[0] ?? "");
  const [data, setData] = useState<CharData | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sCur, setSCur] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [practice, setPractice] = useState(false);
  const [ink, setInk] = useState<string[]>([]);
  const [curInk, setCurInk] = useState<string | null>(null);

  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const inkRef = useRef<SVGSVGElement | null>(null);
  const drawingRef = useRef(false);
  const playingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  /* tô trạng thái tĩnh theo số nét đã hiển thị (port paintIdle) */
  const paintIdle = useCallback((upTo: number) => {
    pathRefs.current.forEach((el) => {
      if (!el) return;
      el.style.transition = "";
      el.style.strokeDasharray = "";
      el.style.strokeDashoffset = "";
    });
    setSCur(upTo);
  }, []);

  const animateStroke = useCallback(
    (i: number, onDone: () => void) => {
      const el = pathRefs.current[i];
      if (!el) {
        onDone();
        return;
      }
      const len = el.getTotalLength?.() ?? 100;
      el.style.transition = "none";
      el.style.strokeDasharray = String(len);
      el.style.strokeDashoffset = String(len);
      void el.getBoundingClientRect();
      const dur = Math.max(280, 720 / speed);
      requestAnimationFrame(() => {
        el.style.transition = `stroke-dashoffset ${dur}ms ease`;
        el.style.strokeDashoffset = "0";
      });
      timerRef.current = setTimeout(() => {
        el.style.transition = "";
        el.style.strokeDasharray = "";
        el.style.strokeDashoffset = "";
        onDone();
      }, dur + 60);
    },
    [speed]
  );

  /* phát lại toàn bộ nét (port playAll) */
  const playAll = useCallback(() => {
    if (!data) return;
    clearTimers();
    playingRef.current = true;
    setPlaying(true);
    setSCur(-1);
    let i = 0;
    const next = () => {
      if (!playingRef.current) return;
      if (i >= data.strokes.length) {
        playingRef.current = false;
        setPlaying(false);
        paintIdle(data.strokes.length - 1);
        toast(`Hoàn thành ${data.strokes.length} nét chữ “${cur}”`);
        return;
      }
      const step = i;
      setSCur(step);
      animateStroke(step, () => {
        i++;
        next();
      });
    };
    next();
  }, [data, cur, animateStroke, paintIdle, toast]);

  /* load data khi mở sheet / đổi chữ (port selectChar) */
  useEffect(() => {
    if (!open) return;
    playingRef.current = false;
    clearTimers();
    setPlaying(false);
    setSCur(-1);
    setPractice(false);
    setInk([]);
    setCurInk(null);
    if (!cur) return;
    let alive = true;
    setLoading(true);
    setFailed(false);
    setData(null);
    HanziWriter.loadCharacterData(cur)
      .then((d) => {
        // typings: Promise<void | CharacterJson> — undefined = chữ chưa có data
        if (!alive) return;
        setLoading(false);
        if (!d) {
          setFailed(true);
          return;
        }
        setData(d as CharData);
      })
      .catch(() => {
        if (!alive) return;
        setLoading(false);
        setFailed(true);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cur]);

  /* autoplay khi data sẵn sàng (port selectChar → playAll) */
  useEffect(() => {
    if (data) playAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  /* dọn timer khi unmount */
  useEffect(() => clearTimers, []);

  /* Esc đóng sheet (port keydown Escape → closeStrokeModal) */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* Nét trước / Nét sau / click row (port strokePrev/strokeNext/orow click) */
  const stepTo = (n: number) => {
    if (!data || practice || playing) return;
    clearTimers();
    playingRef.current = false;
    setPlaying(false);
    const clamped = Math.max(-1, Math.min(data.strokes.length - 1, n));
    paintIdle(clamped);
    if (clamped >= 0) toast(`Nét ${clamped + 1}/${data.strokes.length}`);
  };

  const replay = () => {
    if (!data || practice) return;
    playingRef.current = false;
    setPlaying(false);
    requestAnimationFrame(() => playAll());
  };

  const togglePractice = () => {
    setPractice((v) => {
      const nv = !v;
      if (nv) {
        clearTimers();
        playingRef.current = false;
        setPlaying(false);
      } else {
        setInk([]);
        setCurInk(null);
      }
      return nv;
    });
  };

  /* tự luyện viết (port inkSvg pointer handlers) */
  const svgPoint = (e: React.PointerEvent): string => {
    const r = inkRef.current!.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 3000) / 10;
    const y = Math.round(((e.clientY - r.top) / r.height) * 3000) / 10;
    return `${x},${y}`;
  };
  const onInkDown = (e: React.PointerEvent) => {
    if (!practice) return;
    inkRef.current?.setPointerCapture?.(e.pointerId); // môi trường thiếu pointer capture vẫn vẽ được
    setCurInk(svgPoint(e));
    drawingRef.current = true;
  };
  const onInkMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || !curInk) return;
    setCurInk((pts) => `${pts} ${svgPoint(e)}`);
  };
  const onInkUp = () => {
    if (!drawingRef.current || !curInk) return;
    const pts = curInk.trim().split(/\s+/);
    if (pts.length >= 3) {
      setInk((arr) => {
        const next = [...arr, curInk];
        if (data && next.length === data.strokes.length) {
          toast(`Đủ ${data.strokes.length} nét — đối chiếu với thứ tự mẫu bên phải`);
        }
        return next;
      });
    }
    setCurInk(null);
    drawingRef.current = false;
  };

  if (!open) return null;

  const info = hanziChars[cur];
  const totalStrokes = data?.strokes.length ?? info?.strokes ?? null;
  const curPy = info?.pinyin ?? pinyin ?? "—";
  const stClass = (i: number) =>
    playing
      ? i < sCur
        ? "done"
        : i === sCur
          ? "now"
          : "todo"
      : i <= sCur
        ? "done"
        : "todo";

  return (
    <div
      data-od-id="stroke-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Nét chữ và bút thuận"
      className={cn("fixed inset-0 z-[600]", className)}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <section
        className={cn(
          "absolute left-1/2 top-1/2 max-h-[min(640px,calc(100vh-48px))] w-[min(860px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] border border-border-default bg-surface-paper p-5 shadow-md",
          "max-[640px]:bottom-0 max-[640px]:left-0 max-[640px]:right-0 max-[640px]:top-auto max-[640px]:max-h-[92vh] max-[640px]:w-full max-[640px]:translate-x-0 max-[640px]:translate-y-0 max-[640px]:rounded-b-none",
        )}
      >
        {/* head: char tabs · py-pill · close (port .sheet-head) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="group"
            aria-label="Chọn chữ"
            className="flex gap-0.5 rounded-full border border-border-default bg-surface-muted p-0.5"
          >
            {chars.map((c) => {
              const count = (c === cur ? data?.strokes.length : undefined) ?? hanziChars[c]?.strokes ?? null;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={c === cur}
                  onClick={() => setCur(c)}
                  className={cn(
                    "flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] font-bold transition-colors",
                    c === cur
                      ? "border-border-default bg-surface-elevated text-text-primary shadow-xs"
                      : "border-transparent bg-transparent text-text-secondary hover:text-text-primary",
                  )}
                >
                  <span className="hanzi text-base">{c}</span>
                  {count != null && <small className="text-[11px] font-normal text-text-secondary">{count} nét</small>}
                </button>
              );
            })}
          </div>
          <span className="mx-auto inline-flex items-center gap-1 rounded-full border border-border-default bg-surface-muted py-1 pl-4 pr-1 text-[13px] font-bold text-text-primary">
            <span>{curPy}</span>
            <button
              type="button"
              aria-label="Phát âm chữ Hán"
              onClick={() => speak(cur, { lang: "zh-CN" })}
              className="grid h-8 w-8 place-items-center rounded-full text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
            >
              <Volume2 size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
            </button>
          </span>
          <button
            type="button"
            aria-label="Đóng bảng nét chữ"
            onClick={onClose}
            className="ml-auto grid h-10 w-10 place-items-center rounded-control text-text-secondary hover:bg-surface-muted hover:text-text-primary"
          >
            <X size={16} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        {/* body 2 cột (port .sheet-body) */}
        <div className="mt-4 grid grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-4.5 max-[760px]:grid-cols-1">
          <div>
            <div className="relative mx-auto aspect-square w-[min(320px,100%)] overflow-hidden rounded-[16px] border border-border-default bg-surface-elevated">
              {/* lưng lưới (port .grid-bg) */}
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 300" aria-hidden="true">
                <rect x="4" y="4" width="292" height="292" fill="none" stroke="var(--hz-slate)" strokeWidth="1.5" rx="4" />
                <line x1="150" y1="4" x2="150" y2="296" stroke="var(--hz-slate)" strokeWidth="1" strokeDasharray="7 6" />
                <line x1="4" y1="150" x2="296" y2="150" stroke="var(--hz-slate)" strokeWidth="1" strokeDasharray="7 6" />
                <line x1="4" y1="4" x2="296" y2="296" stroke="var(--hz-slate)" strokeWidth="1" strokeDasharray="5 7" opacity=".7" />
                <line x1="296" y1="4" x2="4" y2="296" stroke="var(--hz-slate)" strokeWidth="1" strokeDasharray="5 7" opacity=".7" />
              </svg>
              {/* nét chữ */}
              <svg
                viewBox="0 0 300 300"
                role="img"
                aria-label={`Hoạt họa bút thuận chữ ${cur}`}
                className="absolute inset-0 h-full w-full"
              >
                {data?.strokes.map((d, i) => (
                  <path
                    key={i}
                    ref={(el) => {
                      pathRefs.current[i] = el;
                    }}
                    d={d}
                    className={`hz-st ${stClass(i)}`}
                  />
                ))}
                {failed && (
                  <text x="150" y="150" textAnchor="middle" fontSize="14" fill="var(--hz-slate)">
                    Không tải được dữ liệu nét chữ
                  </text>
                )}
              </svg>
              {/* tự luyện viết (port inkSvg) */}
              <svg
                ref={inkRef}
                viewBox="0 0 300 300"
                aria-label="Bảng tự luyện viết"
                className="absolute inset-0 h-full w-full"
                style={{ display: practice ? "block" : "none", touchAction: "none" }}
                onPointerDown={onInkDown}
                onPointerMove={onInkMove}
                onPointerUp={onInkUp}
              >
                {ink.map((pts, i) => (
                  <polyline key={i} points={pts} className="hz-ink-path" />
                ))}
                {curInk && <polyline points={curInk} className="hz-ink-path" />}
              </svg>
              {loading && (
                <div className="absolute inset-0 grid place-items-center text-[13px] text-text-secondary">
                  Đang tải nét chữ…
                </div>
              )}
            </div>

            {/* toolbar (port .toolbar) */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2" data-od-id="stroke-toolbar">
              <button
                type="button"
                aria-label="Nét trước"
                onClick={() => stepTo(sCur - 1)}
                disabled={!data || practice || playing}
                className={toolBtn}
              >
                Nét trước
              </button>
              <button
                type="button"
                onClick={replay}
                disabled={!data || practice}
                className={cn(toolBtn, "border-action-primary bg-action-primary text-white hover:bg-action-primary-hover")}
              >
                <RotateCcw size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
                Phát lại
              </button>
              <button
                type="button"
                aria-label="Nét sau"
                onClick={() => stepTo(sCur + 1)}
                disabled={!data || practice || playing}
                className={toolBtn}
              >
                Nét sau
              </button>
              <div
                role="group"
                aria-label="Tốc độ hoạt họa"
                className="flex gap-0.5 rounded-[16px] border border-border-default bg-surface-muted p-0.5"
              >
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={speed === s}
                    onClick={() => setSpeed(s)}
                    className={cn(
                      "min-h-[38px] rounded-[12px] border border-transparent px-2.5 text-xs font-bold transition-colors",
                      speed === s
                        ? "border-border-default bg-surface-elevated text-text-primary shadow-xs"
                        : "text-text-secondary",
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-pressed={practice}
                onClick={togglePractice}
                className={cn(toolBtn, practice && "border-action-primary text-action-primary")}
              >
                <PenTool size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
                Tự luyện viết
              </button>
            </div>

            {/* practice bar (port .practice-bar) */}
            {practice && (
              <div className="mt-2.5 flex items-center justify-center gap-2 text-[12.5px] font-bold text-text-secondary">
                <button
                  type="button"
                  className={toolBtn}
                  onClick={() => setInk((arr) => arr.slice(0, -1))}
                  disabled={ink.length === 0}
                >
                  Hoàn tác
                </button>
                <button
                  type="button"
                  className={toolBtn}
                  onClick={() => setInk([])}
                  disabled={ink.length === 0}
                >
                  Xóa hết
                </button>
                <span data-testid="ink-count">{ink.length} nét đã viết{totalStrokes != null ? ` / ${totalStrokes}` : ""}</span>
              </div>
            )}
          </div>

          {/* info col (port .info-col) */}
          <div className="flex min-w-0 flex-col gap-3">
            {failed && (
              <div className="px-3 py-7 text-center text-[13px] text-text-secondary">
                Chữ “{cur}” sẽ được bổ sung dữ liệu bút thuận.
                <br />
                Kiểm tra kết nối mạng rồi thử lại.
              </div>
            )}
            {info && (
              <div className="flex items-center gap-3.5 rounded-[16px] border border-border-default bg-surface-elevated px-4 py-3.5">
                <span className="hanzi grid h-14 w-14 shrink-0 place-items-center rounded-[14px] border border-learning-mastered bg-learning-mastered/10 text-[28px] font-bold text-learning-mastered">
                  {info.radical}
                </span>
                <span className="min-w-0">
                  <b className="block text-sm">{info.radical} — bộ chính của {cur}</b>
                  <span className="line-clamp-2 text-[12.5px] text-text-secondary">{info.meaning}</span>
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <div className="min-w-[120px] flex-1 rounded-[12px] border border-border-default bg-surface-elevated px-3 py-2.5">
                <small className="block text-[11px] font-bold tracking-[.06em] text-text-secondary">TỔNG SỐ NÉT</small>
                <b className="text-[13.5px]">
                  {totalStrokes != null ? `${totalStrokes} nét` : "—"}
                  {info ? ` • ${info.level}` : ""}
                </b>
              </div>
              {info?.composition && (
                <div className="min-w-[120px] flex-1 rounded-[12px] border border-border-default bg-surface-elevated px-3 py-2.5">
                  <small className="block text-[11px] font-bold tracking-[.06em] text-text-secondary">THÀNH PHẦN</small>
                  <b className="hanzi text-[13.5px]">{info.composition.join(" + ")}</b>
                </div>
              )}
            </div>
            <div className="max-h-[165px] overflow-y-auto rounded-[16px] border border-border-default bg-surface-elevated p-2">
              <h4 className="px-2 pb-1 pt-1.5 text-[11px] font-extrabold tracking-[.08em] text-text-secondary">
                DANH SÁCH BÚT THUẬN
              </h4>
              {!data && (
                <p className="px-2 pb-2 text-[13px] text-text-secondary">
                  {loading ? "Đang tải…" : "Chưa có dữ liệu nét cho chữ này."}
                </p>
              )}
              {data?.strokes.map((_, i) => {
                const active = !playing && sCur === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => stepTo(i)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left text-[13px] text-text-primary hover:bg-surface-muted",
                      active && "bg-surface-muted shadow-[inset_3px_0_0_var(--action-primary)]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-full border text-[11px] font-extrabold",
                        active ? "border-action-primary bg-action-primary text-white" : "border-border-default bg-surface-muted",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span>Nét {i + 1}</span>
                  </button>
                );
              })}
            </div>
            {TIPS[cur] && (
              <div className="rounded-[16px] border border-border-default bg-surface-elevated px-3.5 py-3">
                <h4 className="pb-1 text-[11px] font-extrabold tracking-[.08em] text-text-secondary">MẸO GHI NHỚ</h4>
                <p className="text-[13px] text-text-secondary">{TIPS[cur]}</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
