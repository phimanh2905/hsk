"use client";
/* DictationPanel — chế độ Chép chính tả (port dict-box của studio, tách component).
   Variant "typing" (Task 7): gõ chữ → per-char diff + stats badges.
   Variant "arrange" (Task 8) sẽ render trong chính component này, dưới switch. */
import { useEffect, useMemo, useState } from "react";
import { diffChars, type DiffResult } from "@/lib/shadowing/diff-chars";
import { getDictStats, recordDictCheck, recordReplay } from "@/lib/shadowing/dictation-stats";
import { getDictVariant, setDictVariant } from "@/lib/shadowing/prefs";
import { normDict } from "@/lib/shadowing/dictation";
import { seedFor, shuffleSeeded } from "@/lib/shadowing/arrange";
import { useToast } from "@/components/shell/toast-provider";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Volume2, Eye, ICON_STROKE } from "@/components/ui/icon";
import type { SubtitleSentence } from "@/content/shadowing";

/* mm:ss — hàng "CÂU n/N · mốc thời gian" */
function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.round(t % 60);
  return m + ":" + String(s).padStart(2, "0");
}

/* full text trừ dấu câu + khoảng trắng, tách từng chữ (gợi ý ô trống) */
function dictChars(full: string): string[] {
  return full.replace(/[。，、！？…—\s]/g, "").split("");
}

export type DictEng = { cur: number; listenCurrent: () => void; listenSlow: () => void; prev: () => void; next: () => void };

export default function DictationPanel({
  subs,
  cur,
  videoId,
  eng,
  recordPractice,
  hidden,
}: {
  subs: SubtitleSentence[];
  cur: number;
  videoId: string;
  eng: DictEng;
  recordPractice: (id: string, patch: { score?: number; linesDoneDelta?: number }) => void;
  hidden?: boolean;
}) {
  const toast = useToast();
  const curSub = subs[Math.min(cur, subs.length - 1)] ?? subs[0];
  const full = curSub ? curSub.parts.map((p) => p.zh).join(" ") : "";
  const [variant, setVariant] = useState<"typing" | "arrange">("typing");
  useEffect(() => setVariant(getDictVariant()), []);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<null | { kind: "empty" | "correct" | "wrong"; diff?: DiffResult; prevLast?: number }>(null);
  const [dictShown, setDictShown] = useState(0); // số chữ đã mở trong "Gợi ý ô trống"
  const [stats, setStats] = useState(() => getDictStats(videoId));
  useEffect(() => {
    setValue("");
    setResult(null);
    setDictShown(0);
    setStats(getDictStats(videoId));
  }, [curSub, videoId]);

  const lineStat = curSub ? stats[String(curSub.n)] : undefined;

  function check() {
    if (!curSub) return;
    const prevLast = lineStat?.lastScore;
    if (!normDict(value)) { setResult({ kind: "empty", prevLast }); return; }
    const d = diffChars(value, full);
    const ok = d.errors === 0 && d.missing === 0;
    const score = ok ? 100 : Math.max(0, Math.round(((d.total - d.errors - d.missing) / Math.max(1, d.total)) * 100));
    setResult({ kind: ok ? "correct" : "wrong", diff: d, prevLast });
    recordDictCheck(videoId, curSub.n, score, d.errors + d.missing);
    setStats(getDictStats(videoId));
    if (ok) recordPractice(videoId, { score, linesDoneDelta: 1 });
  }

  const pickReplay = () => {
    if (!curSub) return;
    recordReplay(videoId, curSub.n);
    eng.listenCurrent();
  };

  const hintLen = Math.max(8, Math.floor((curSub?.pinyin.length ?? 0) * 0.4));
  const chars = dictChars(full);

  /* --- variant arrange (Task 8): ghép từ shuffle deterministic --- */
  const tiles: string[] = curSub?.words?.length
    ? curSub.words.map((w) => w.zh)
    : (curSub?.parts.map((p) => p.zh) ?? []);
  const [built, setBuilt] = useState<number[]>([]); // index vào shuffled
  const [wrong, setWrong] = useState(false);
  const [checked, setChecked] = useState(false);
  const [arrangeDiff, setArrangeDiff] = useState<DiffResult | null>(null);
  const shuffled = useMemo(
    () => shuffleSeeded(tiles.map((zh, i) => ({ zh, i })), seedFor(videoId, curSub?.n ?? 0)),
    // tiles bắt nguồn hoàn toàn từ curSub — videoId đổi luôn kéo curSub đổi
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [curSub, videoId],
  );
  useEffect(() => {
    setBuilt([]);
    setWrong(false);
    setChecked(false);
    setArrangeDiff(null);
  }, [curSub, videoId]);

  function checkArrange() {
    if (!curSub) return;
    const guess = built.map((si) => shuffled[si].zh).join("");
    const d = diffChars(guess, full);
    const ok = d.errors === 0 && d.missing === 0;
    setWrong(!ok);
    setChecked(true);
    setArrangeDiff(d);
    recordDictCheck(videoId, curSub.n, ok ? 100 : 0, d.errors + d.missing);
    if (ok) {
      recordPractice(videoId, { score: 100, linesDoneDelta: 1 });
      eng.next();
    }
  }
  /* --- hết variant arrange --- */

  return (
    <div data-testid="dict-box" data-od-id="dictation-box" hidden={hidden} className="mt-3 space-y-3">
      {/* variant switch — typing (Task 7) / arrange (Task 8) */}
      <div role="group" aria-label="Kiểu chép chính tả" className="flex gap-1 rounded-control border border-border-subtle bg-surface-muted p-0.5">
        <button
          type="button"
          data-testid="dict-variant-typing"
          aria-pressed={variant === "typing"}
          onClick={() => { setVariant("typing"); setDictVariant("typing"); }}
          className={
            "min-h-9 flex-1 rounded-[9px] px-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2 " +
            (variant === "typing" ? "bg-surface-elevated text-text-primary shadow-xs" : "text-text-secondary")
          }
        >
          Gõ chữ
        </button>
        <button
          type="button"
          data-testid="dict-variant-arrange"
          aria-pressed={variant === "arrange"}
          onClick={() => { setVariant("arrange"); setDictVariant("arrange"); }}
          className={
            "min-h-9 flex-1 rounded-[9px] px-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2 " +
            (variant === "arrange" ? "bg-surface-elevated text-text-primary shadow-xs" : "text-text-secondary")
          }
        >
          Ghép từ
        </button>
      </div>

      {variant === "typing" && (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-extrabold tracking-wide">CÂU {cur + 1} / {subs.length}</p>
            <small className="text-xs tabular-nums text-text-secondary">
              Mốc thời gian {fmt(curSub?.start ?? 0)} – {fmt(curSub?.end ?? 0)}
            </small>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" data-testid="dict-listen" onClick={pickReplay}>
              <Volume2 size={14} strokeWidth={ICON_STROKE} /> Nghe câu mẫu
            </Button>
            <Button variant="secondary" size="sm" data-testid="dict-slow" onClick={() => eng.listenSlow()}>
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
                <Eye size={14} strokeWidth={ICON_STROKE} /> Gợi ý 1 chữ
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

          <div data-testid="dict-result" className="space-y-2">
            {result?.kind === "empty" && (
              <p className="text-sm text-text-secondary">Hãy gõ những gì bạn nghe được trước đã.</p>
            )}

            {/* per-char diff */}
            <div className="flex flex-wrap gap-1.5" data-testid="dict-diff" hidden={!result?.diff}>
              {result?.diff?.marks.map((m, i) => (
                <span
                  key={i}
                  className={
                    "hanzi grid h-9 w-9 place-items-center rounded-lg border text-lg " +
                    (m.state === "ok"
                      ? "dict-ok border-feedback-success bg-jade-wash text-feedback-success"
                      : m.state === "bad"
                        ? "dict-bad border-feedback-error bg-rose-wash text-feedback-error"
                        : "dict-neutral border-border-subtle bg-surface-muted text-text-secondary")
                  }
                >
                  {m.ch}
                </span>
              ))}
            </div>

            {/* stats badges */}
            {result?.diff && (
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <Chip tone="neutral" data-testid="dict-badge-errors" className="min-h-6 px-2">Lỗi sai: {result.diff.errors}</Chip>
                <Chip tone="neutral" data-testid="dict-badge-missing" className="min-h-6 px-2">Thiếu: {result.diff.missing}</Chip>
                <Chip tone="neutral" data-testid="dict-badge-last" className="min-h-6 px-2">
                  Điểm lần trước: {result.prevLast ?? lineStat?.lastScore ?? "—"}
                </Chip>
                <Chip tone="neutral" data-testid="dict-badge-replays" className="min-h-6 px-2">Lượt phát lại: {lineStat?.replays ?? 0}</Chip>
              </div>
            )}

            <p data-testid="dict-reason" className="text-sm font-bold">
              {result?.kind === "correct"
                ? "Hoàn toàn chính xác"
                : result?.kind === "wrong"
                  ? `Bạn mắc ${(result.diff?.errors ?? 0) + (result.diff?.missing ?? 0)} lỗi — nghe lại và sửa nhé`
                  : ""}
            </p>

            {/* giữ message cũ cho e2e/QA hiện có */}
            {result?.kind === "correct" && (
              <p className="font-bold text-feedback-success">
                Chính xác!{curSub?.pinyin ? <span className="italic"> {curSub.pinyin}</span> : null}
              </p>
            )}
            {result?.kind === "wrong" && (
              <p className="font-bold text-feedback-error">Chưa đúng — nghe lại và thử tiếp nhé (đáp án vẫn đang ẩn)</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" data-testid="dict-prev" onClick={eng.prev}>◀ Câu trước</Button>
            {/* cả hai testid dict-skip (cũ) + dict-next (mới) — HTML không cho 2 data-testid
                trên 1 nút nên giữ dict-skip trên wrapper (click xuyên qua nút) */}
            <span data-testid="dict-skip" className="contents" aria-hidden="false">
              <Button variant="secondary" size="sm" data-testid="dict-next" onClick={eng.next} className="ml-auto">
                Bỏ qua / Tiếp ▶
              </Button>
            </span>
          </div>
        </>
      )}

      {variant === "arrange" && (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-extrabold tracking-wide">CÂU {cur + 1} / {subs.length}</p>
            <small className="text-xs tabular-nums text-text-secondary">
              Mốc thời gian {fmt(curSub?.start ?? 0)} – {fmt(curSub?.end ?? 0)}
            </small>
          </div>

          <Button variant="secondary" size="sm" data-testid="dict-listen" onClick={pickReplay}>
            <Volume2 size={14} strokeWidth={ICON_STROKE} /> Nghe câu mẫu
          </Button>

          {/* hàng đã ghép — khi sai: testid dict-arrange-wrong trên wrapper + tile viền đỏ */}
          <div className="rounded-2xl border border-border-subtle bg-surface-muted p-3">
            <p className="text-[11px] font-extrabold tracking-wider text-text-secondary">ĐÃ GHÉP</p>
            <div
              data-testid="dict-arrange-built"
              className={
                "mt-2 flex flex-wrap gap-1.5 rounded-lg p-1 " +
                (wrong ? "border border-feedback-error bg-rose-wash" : "border border-dashed border-border-subtle")
              }
            >
              {wrong && built.length > 0 && <span data-testid="dict-arrange-wrong" className="contents" aria-hidden="false" />}
              {built.map((si) =>
                shuffled[si] ? (
                  <button
                    key={si}
                    type="button"
                    data-testid="dict-arrange-tile"
                    onClick={() => setBuilt((b) => b.filter((x) => x !== si))}
                    className={
                      "hanzi grid h-9 place-items-center rounded-lg border px-3 text-lg " +
                      (wrong
                        ? "border-feedback-error bg-rose-wash text-feedback-error"
                        : "border-border-subtle bg-surface-elevated")
                    }
                  >
                    {shuffled[si].zh}
                  </button>
                ) : null,
              )}
            </div>
          </div>

          {/* hàng mảnh còn lại */}
          <div className="rounded-2xl border border-border-subtle bg-surface-muted p-3">
            <p className="text-[11px] font-extrabold tracking-wider text-text-secondary">MẢNH TỪ</p>
            <div data-testid="dict-arrange-bank" className="mt-2 flex flex-wrap gap-1.5">
              {shuffled.map((t, si) =>
                built.includes(si) ? null : (
                  <button
                    key={si}
                    type="button"
                    data-testid="dict-arrange-tile"
                    onClick={() => { setWrong(false); setBuilt((b) => [...b, si]); }}
                    className="hanzi grid h-9 place-items-center rounded-lg border border-border-subtle bg-surface-elevated px-3 text-lg"
                  >
                    {t.zh}
                  </button>
                ),
              )}
            </div>
          </div>

          <Button variant="primary" data-testid="dict-arrange-check" onClick={checkArrange} className="w-full">
            KIỂM TRA
          </Button>

          <div className="space-y-2">
            {checked && arrangeDiff && wrong && (
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <Chip tone="neutral" data-testid="dict-badge-errors" className="min-h-6 px-2">Lỗi sai: {arrangeDiff.errors}</Chip>
                <Chip tone="neutral" data-testid="dict-badge-missing" className="min-h-6 px-2">Thiếu: {arrangeDiff.missing}</Chip>
              </div>
            )}
            <p data-testid="dict-reason" className="text-sm font-bold">
              {checked && !wrong
                ? "Hoàn toàn chính xác"
                : checked
                  ? `Bạn mắc ${(arrangeDiff?.errors ?? 0) + (arrangeDiff?.missing ?? 0)} lỗi — nghe lại và sửa nhé`
                  : ""}
            </p>
            {checked && !wrong && (
              <p className="font-bold text-feedback-success">Chính xác!{curSub?.pinyin ? <span className="italic"> {curSub.pinyin}</span> : null}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
