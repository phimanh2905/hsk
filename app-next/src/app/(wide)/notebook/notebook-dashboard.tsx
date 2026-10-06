"use client";
/* NotebookDashboard (port notebook.html) — hero đếm từ entries thật, shelf 1 sổ
   thật + 3 sổ tĩnh, filters + search client-side. mounted gate chống hydration
   (relative time + đếm tuần chỉ tính client, spec §7). */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useNotebookEntries } from "@/lib/notebook/use-notebook-entries";
import { notebookStats } from "@/lib/notebook/entries";
import { notebookBooks } from "@/content/notebook-books";
import { safeParsePayload } from "@/lib/notebook/payload";
import { fmtRelativeDate } from "@/components/notebook/notebook-list";
import { useToast } from "@/components/shell/toast-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, NotebookPen, Target } from "@/components/ui/icon";

type Filter = "all" | "wrong" | "chars" | "personal";

/* Tone badge theo kind (port notebook.html .tag) */
const TAG_TONE_CLS = {
  red: "border-feedback-error/40 bg-rose-wash/50 text-feedback-error-text",
  lav: "border-feature-ai bg-feature-ai/10 text-feature-ai",
  per: "border-jade-wash bg-jade-wash text-feedback-success",
} as const;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tất cả mục" },
  { key: "wrong", label: "Câu sai chưa sửa" },
  { key: "chars", label: "Chữ Hán dễ nhầm" },
  { key: "personal", label: "Ghi chú cá nhân" },
];

export default function NotebookDashboard({ now }: { now?: Date }) {
  const { entries, ready, create, setSaved } = useNotebookEntries();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("wrong"); // mock mặc định "Câu sai chưa sửa"
  const [q, setQ] = useState("");
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<HTMLDivElement | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  void ready;

  useEffect(() => setMounted(true), []);
  // phím "/" focus search (mock notebook.html) — bỏ qua khi đang gõ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && !(t && (t.matches?.("input, textarea, select") || t.isContentEditable))) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const stats = mounted ? notebookStats(entries, now) : { total: 0, wrongTotal: 0, wrongWeek: 0, wrongUnfixedWeek: 0, fixedPct: null };
  const shown = useMemo(() => {
    if (!mounted) return [];
    const needle = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (!safeParsePayload(e.kind, e.payload)) return false; // payload hỏng → bỏ qua
      const okF = filter === "all" || e.kind === filter;
      const okQ = !needle || JSON.stringify({ tag: e.tag, ...e.payload }).toLowerCase().includes(needle);
      return okF && okQ;
    });
  }, [entries, filter, q, mounted]);

  return (
    <div className="flex flex-col gap-4">
      {/* search hàng đầu (mock đặt trong topbar — app có topbar riêng nên đưa vào page) */}
      <div className="flex items-center gap-3">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-full border border-border-default bg-surface-elevated px-4" data-od-id="notebook-search" data-testid="notebook-search">
          <Search size={16} strokeWidth={1.5} aria-hidden="true" className="text-text-secondary" />
          <input
            ref={searchRef} type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm kiếm trong tất cả sổ tay..." aria-label="Tìm kiếm trong tất cả sổ tay"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-text-faint"
          />
          <kbd className="rounded-md border border-border-default bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-text-secondary">/</kbd>
        </label>
      </div>

      {/* hero */}
      <section className="grid items-center gap-6 rounded-3xl border border-border-subtle bg-surface-elevated p-6 shadow-md lg:grid-cols-[1fr_auto]" data-od-id="notebook-hero" data-testid="notebook-hero" aria-label="Bàn chỉ huy sổ tay">
        <div>
          <p className="text-xs font-bold tracking-wider text-feedback-success">TRUNG TÂM GHI CHÉP &amp; HÓA GIẢI ĐIỂM MÙ</p>
          <h1 className="mt-1 text-[21px] font-extrabold leading-snug">
            {stats.wrongWeek > 0
              ? `Có ${stats.wrongWeek} câu làm sai tuần này cần xem lại`
              : "Chưa có câu sai nào tuần này — cứ tiến lên!"}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-text-secondary">Mỗi lỗi sai đã được gắn nguyên nhân gốc — sửa 1 lần, nhớ cả cụm.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-border-default bg-surface-muted px-3.5 py-[7px] text-xs font-bold">📕 4 Sổ chuyên đề</span>
            <span className="rounded-full border border-border-default bg-surface-muted px-3.5 py-[7px] text-xs font-bold">📝 {stats.total} Mục ghi chép</span>
            <span className="rounded-full border border-jade-wash bg-jade-wash px-3.5 py-[7px] text-xs font-bold text-feedback-success">🛡️ Đã khắc phục: {stats.fixedPct || "—"}%</span>
          </div>
        </div>
        <Link
          href="/review" data-od-id="notebook-cta" data-testid="notebook-cta"
          className="inline-flex max-w-[300px] items-center justify-center gap-2 rounded-2xl border border-action-primary bg-action-primary px-6 py-3.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-action-hover focus-visible:ring-3 ring-action-focus ring-offset-2 lg:min-h-[52px]"
        >
          <Target size={16} strokeWidth={1.5} aria-hidden="true" />
          {stats.wrongWeek > 0 ? `Ôn tập ${stats.wrongWeek} lỗi sai ngay` : "Ôn tập lỗi sai ngay"}
        </Link>
      </section>

      {/* shelf 4 sổ */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Tủ sổ tay chuyên đề" data-od-id="notebook-shelf" data-testid="notebook-shelf">
        <article className="flex flex-col gap-1.5 rounded-card border border-border-subtle bg-surface-elevated p-[18px] shadow-xs transition-transform hover:-translate-y-0.5" data-od-id="book-mistakes" data-testid="book-mistakes">
          <div className="grid h-10 w-10 place-items-center rounded-[11px] border border-border-default bg-surface-muted text-[19px]">🛑</div>
          <h3 className="text-[13.5px] leading-snug font-extrabold">SỔ CÂU LÀM SAI<span className="hanzi block text-[11px] font-normal text-text-secondary">错题本 · Tự động gom</span></h3>
          <p className="text-[17px] font-bold">{stats.wrongTotal} câu hỏi cần nhớ</p>
          <p className="text-xs text-text-secondary">
            {stats.wrongUnfixedWeek > 0
              ? <span className="inline-block rounded-full border border-amber-wash bg-amber-wash px-2.5 py-0.5 text-[10.5px] font-bold text-amber-ink">Cần xử lý: {stats.wrongUnfixedWeek} câu</span>
              : <span className="inline-block rounded-full border border-jade-wash bg-jade-wash px-2.5 py-0.5 text-[10.5px] font-bold text-feedback-success">Đã xử lý hết 🎉</span>}
          </p>
          <Button variant="secondary" size="sm" className="mt-2.5 w-full" onClick={() => { setFilter("wrong"); streamRef.current?.scrollIntoView?.({ behavior: "smooth" }); }}>Mở sổ lỗi sai</Button>
        </article>
        {notebookBooks.map((b) => (
          <article key={b.id} className="flex flex-col gap-1.5 rounded-card border border-border-subtle bg-surface-elevated p-[18px] shadow-xs transition-transform hover:-translate-y-0.5" data-od-id={`book-${b.id}`} data-testid={`book-${b.id}`}>
            <div className="grid h-10 w-10 place-items-center rounded-[11px] border border-border-default bg-surface-muted text-[19px]">{b.icon}</div>
            <h3 className="text-[13.5px] leading-snug font-extrabold">{b.title}<span className="hanzi block text-[11px] font-normal text-text-secondary">{b.sub}</span></h3>
            <p className="text-[17px] font-bold">{b.big}</p>
            <p className="text-xs text-text-secondary">
              <span className={"inline-block rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold " + (b.badgeTone === "ok" ? "border-jade-wash bg-jade-wash text-feedback-success" : "border-border-default bg-surface-muted text-text-primary")}>{b.badge}</span>
            </p>
            <Button variant="secondary" size="sm" className="mt-2.5 w-full" onClick={() => toast("Sắp có — đang biên tập nội dung luyện cho sổ này")}>{b.cta}</Button>
          </article>
        ))}
      </section>

      {/* filters */}
      <div ref={streamRef} className="flex flex-wrap items-center gap-2" id="stream" role="group" aria-label="Bộ lọc dòng ghi chép" data-od-id="stream-filters" data-testid="stream-filters">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}
            className={"min-h-10 rounded-full border px-4 text-xs font-bold transition-colors focus-visible:ring-3 ring-action-focus ring-offset-2 " + (filter === f.key ? "border-action-primary bg-surface-elevated text-action-primary shadow-[0_0_0_3px] shadow-rose-wash" : "border-border-default bg-surface-elevated text-text-secondary hover:border-text-faint hover:text-text-primary")}>
            {f.label}
          </button>
        ))}
        <Button variant="secondary" size="sm" className="ml-auto rounded-full" data-od-id="add-note" data-testid="add-note" onClick={() => setAddOpen(true)}>
          <NotebookPen size={14} strokeWidth={1.5} aria-hidden="true" /> + Tạo sổ mới
        </Button>
      </div>

      {/* stream — card theo kind (port notebook.html mistake-stream) */}
      <div ref={streamRef} className="flex flex-col gap-4" aria-label="Dòng ghi chép gần đây" data-od-id="mistake-stream" data-testid="mistake-stream">
        {shown.map((e) => {
          const p = safeParsePayload(e.kind, e.payload);
          if (!p) return null;
          return (
            <article key={e.id} className="flex flex-col gap-3 rounded-card border border-border-subtle bg-surface-elevated p-5 shadow-xs" data-od-id={`note-${e.id}`} data-testid={`note-${e.id}`}>
              {/* mhead: tag + time + ghim/tùy chọn */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={"rounded-full border px-3 py-1 text-[11px] font-bold " + TAG_TONE_CLS[e.tagTone]}>{e.tag}</span>
                <span className="text-xs text-text-secondary">{fmtRelativeDate(e.createdAt)}</span>
                <span className="ml-auto flex gap-1.5">
                  <button onClick={() => { setSaved(e.id, !e.saved); toast(e.saved ? "Đã bỏ ghim ghi chú" : "Đã ghim ★ ghi chú"); }}
                    aria-pressed={e.saved} aria-label="Yêu thích"
                    className={"grid h-9 w-9 place-items-center rounded-[9px] border text-[15px] focus-visible:ring-3 ring-action-focus ring-offset-2 " + (e.saved ? "border-amber-wash bg-amber-wash text-amber-ink" : "border-border-default bg-surface-elevated text-text-secondary hover:border-text-faint")}>★</button>
                  <button onClick={() => toast("Tùy chọn: ghim · chuyển sổ · báo lỗi nội dung")} aria-label="Tùy chọn"
                    className="grid h-9 w-9 place-items-center rounded-[9px] border border-border-default bg-surface-elevated text-[15px] text-text-secondary hover:border-text-faint focus-visible:ring-3 ring-action-focus ring-offset-2">⋮</button>
                </span>
              </div>
              {/* body theo kind */}
              {e.kind === "wrong" && p && "q" in p && (
                <>
                  <p className="hanzi text-lg leading-relaxed">{p.q}</p>
                  <div className="grid gap-2">
                    <div className="flex items-start gap-2.5 rounded-[10px] border border-feedback-error/40 bg-rose-wash/40 px-3 py-2.5 text-[13.5px]">
                      <span aria-hidden="true">❌</span>
                      <span>{p.wrong ? <>Bạn đã chọn: <b className="text-feedback-error-text line-through">{p.wrong.zh}</b>{p.wrong.py ? ` (${p.wrong.py})` : null}</> : "Bạn chưa nhớ:"}</span>
                    </div>
                    <div className="flex items-start gap-2.5 rounded-[10px] border border-jade-wash bg-jade-wash px-3 py-2.5 text-[13.5px]">
                      <span aria-hidden="true">✅</span>
                      <span>Đáp án đúng: <b className="text-feedback-success">{p.right.zh}</b>{p.right.py ? ` (${p.right.py})` : null}</span>
                    </div>
                  </div>
                  <div className="flex gap-2.5 rounded-[10px] border border-border-default bg-surface-muted px-3 py-2.5 text-xs">
                    <span aria-hidden="true">💡</span>
                    <span><b>Điểm mấu chốt:</b> {p.cause}</span>
                  </div>
                </>
              )}
              {e.kind === "chars" && p && "chars" in p && (
                <>
                  <div className="flex flex-wrap items-center gap-3.5 rounded-xl border border-dashed border-border-default bg-surface-paper p-3.5">
                    {p.chars.map((c, i) => (
                      <span key={i} className="flex items-center gap-3.5">
                        {i > 0 && <b className="text-text-faint">vs</b>}
                        <span className="text-center"><b className="hanzi block text-[28px] leading-tight">{c.zh}</b><span className="text-[11.5px] text-text-secondary">{c.py}</span></span>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2.5 rounded-[10px] border border-border-default bg-surface-muted px-3 py-2.5 text-xs"><span aria-hidden="true">💡</span><span>{p.tip}</span></div>
                </>
              )}
              {e.kind === "personal" && p && "note" in p && (
                <div className="rounded-[10px] border border-border-default bg-surface-paper px-3 py-2.5 text-[13px]">{p.note}</div>
              )}
              {/* footer CTA */}
              {e.kind === "wrong" && <Link href="/review" className="mt-1 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border-default bg-surface-muted px-4 text-xs font-bold hover:border-text-faint focus-visible:ring-3 ring-action-focus ring-offset-2">Thử thách lại câu này</Link>}
              {e.kind === "chars" && <Link href="/hanzi" className="mt-1 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border-default bg-surface-muted px-4 text-xs font-bold hover:border-text-faint focus-visible:ring-3 ring-action-focus ring-offset-2">Xem bút thuận nét viết</Link>}
            </article>
          );
        })}
        {mounted && shown.length === 0 && (
          <p className="rounded-card border border-border-subtle bg-surface-elevated p-[30px] text-center text-[13.5px] text-text-secondary" data-od-id="stream-empty" data-testid="stream-empty">
            Không có mục nào khớp bộ lọc. Thử từ khóa khác.
          </p>
        )}
      </div>

      {/* Dialog tạo ghi chú cá nhân (spec §2.5) */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} labelledBy="dlg-note-title" className="max-w-md p-6">
        <h2 id="dlg-note-title" className="text-lg font-extrabold">Ghi chú cá nhân</h2>
        <p className="mt-1 text-[13px] text-text-secondary">Sổ chuyên đề tự gom từ luyện tập — ghi chú tự do của bạn lưu ở đây.</p>
        <Textarea aria-label="Nội dung ghi chú" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="Ví dụ: Khi từ chối lịch sự, dùng “恐怕不太方便” mềm hơn “不行”…"
          className="mt-3 min-h-24 zh" />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAddOpen(false)}>Hủy</Button>
          <Button disabled={noteDraft.trim().length < 2} onClick={() => {
            create({ kind: "personal", tag: "📝 Ghi chú cá nhân", tagTone: "per", payload: { note: noteDraft.trim() }, source: "manual" });
            setNoteDraft(""); setAddOpen(false); setFilter("personal"); toast("Đã lưu ghi chú");
          }}>Lưu ghi chú</Button>
        </div>
      </Dialog>
    </div>
  );
}
