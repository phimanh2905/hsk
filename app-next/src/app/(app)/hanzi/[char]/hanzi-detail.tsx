"use client";
/* Port 1:1 từ clone/js/hanzi.js renderDetail (dòng 127-253) — /hanzi/[char] màn 2.
   Layout 3 cột desktop (tìm+vẽ | khung chữ + animation nét | từ vựng), xếp dọc mobile.
   Chữ không có data → fallback verbatim; animation nét qua useStrokePlayer (Task 11). */
import { useRef, useState } from "react";
import Link from "next/link";
import { hanziChars, type HanziInfo } from "@/content/hanzi";
import { useStrokePlayer } from "@/components/hanzi/stroke-player";
import { DrawPad } from "@/components/hanzi/draw-pad";
import { useTts } from "@/lib/tts/use-tts";
import { SearchCard } from "../search-card";

/* fallback cho chữ chưa có dữ liệu — verbatim theo clone */
const FALLBACK: HanziInfo = {
  hanzi: "",
  hanViet: "—",
  pinyin: "?",
  level: "?",
  strokes: "?" as unknown as number,
  radical: "—",
  type: "—",
  meaning: "Chưa có dữ liệu chi tiết cho chữ này (bản demo chỉ có dữ liệu HSK 1).",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="font-bold shrink-0 w-28">{label}:</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

function ToggleBtn({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on ? "true" : "false"}
      className={(on ? "btn-main" : "btn-ghost") + " px-3 py-2 text-sm"}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function HanziDetail({ char }: { char: string }) {
  const known = !!hanziChars[char];
  const c = known ? hanziChars[char] : { ...FALLBACK, hanzi: char };
  const { speak } = useTts();
  const writerRef = useRef<HTMLDivElement | null>(null);
  const player = useStrokePlayer(writerRef, char);
  const [arrows, setArrows] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [contains, setContains] = useState(false);

  const go = (ch: string) => {
    window.location.assign("/hanzi/" + encodeURIComponent(ch));
  };

  const alt = c.hanVietAlt ? " (còn đọc: " + c.hanVietAlt + ")" : "";
  const radical = c.radical || "—";
  const radicalLinked = (known && !!hanziChars[radical]) || (known && c.radicalLink && radical !== "—");
  const compParts = c.composition || [];
  const related = Object.keys(hanziChars).filter((k) => {
    const o = hanziChars[k];
    return o.radical === char || (o.composition || []).indexOf(char) !== -1;
  });
  const keys = Object.keys(hanziChars);
  const idx = keys.indexOf(char);
  const next = keys[(idx + 1) % keys.length] || "好";

  return (
    <div>
      <header className="mb-4">
        <Link
          href="/hanzi"
          className="text-sm font-semibold text-[var(--nhai-muted)] hover:text-[var(--nhai-main)]"
        >
          ← Phân tích Hán tự
        </Link>
      </header>

      <div className="grid lg:grid-cols-10 gap-6">
        {/* Sidebar trái: tìm + vẽ */}
        <aside className="lg:col-span-3 space-y-4 order-2 lg:order-1">
          <div className="card shadow-neo p-4">
            <h2 className="font-extrabold mb-2">🔍 Tìm chữ Hán</h2>
            <SearchCard go={go} />
          </div>
          <div className="card shadow-neo p-4">
            <h2 className="font-extrabold mb-2">✍️ Vẽ chữ Hán</h2>
            <DrawPad size={240} onPick={go} />
          </div>
        </aside>

        {/* Trung tâm */}
        <div className="lg:col-span-4 order-1 lg:order-2">
          <div className="relative mx-auto w-[260px] h-[260px]">
            <div className="absolute inset-0 card flex items-center justify-center" style={{ borderWidth: 2 }}>
              <span className="zh font-black" style={{ fontSize: 150, lineHeight: 1 }}>
                {char}
              </span>
            </div>
            <div ref={writerRef} className="absolute inset-0"></div>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => player.play()}>
              Xem lại thứ tự nét
            </button>
            <ToggleBtn
              label="Hiển thị hạt mũi tên"
              on={arrows}
              onClick={() => {
                const on = !arrows;
                player.showArrows(on);
                setArrows(on);
              }}
            />
            <ToggleBtn
              label="Hiển thị chữ chứa chữ này"
              on={contains}
              onClick={() => setContains((v) => !v)}
            />
            <ToggleBtn
              label="Thu phóng vừa khít"
              on={zoom}
              onClick={() => {
                const on = !zoom;
                player.setZoom(on);
                setZoom(on);
              }}
            />
          </div>
          {contains && (
            <div className="card p-3 mt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--nhai-muted)] mb-2">
                Chữ chứa chữ này
              </p>
              <div className="flex flex-wrap gap-2">
                {related.length === 0 ? (
                  <span className="text-sm text-[var(--nhai-muted)] font-semibold">Không có chữ nào.</span>
                ) : (
                  related.map((k) => (
                    <Link
                      key={k}
                      href={"/hanzi/" + encodeURIComponent(k)}
                      className="grid-cell w-14 h-14 text-2xl zh font-bold hover:border-[var(--nhai-main)]"
                    >
                      {k}
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap mt-5">
            <h1 className="text-4xl font-extrabold">
              {char} - {c.hanViet}
            </h1>
            <button
              type="button"
              className="btn-ghost w-11 h-11 text-xl"
              title={"Phát âm " + char}
              onClick={() => speak(char, { lang: "zh-CN" })}
            >
              🔊
            </button>
          </div>
          <Link
            href="/sound-rules"
            className="inline-block mt-2 text-sm font-semibold text-[var(--nhai-accent)] hover:underline"
          >
            → Quy tắc chuyển âm
          </Link>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Âm Hán Việt">
              <span className="font-bold">{c.hanViet}</span>
              {c.hanVietAlt && <span className="text-[var(--nhai-muted)]"> (còn đọc: {c.hanVietAlt})</span>}
            </Row>
            <Row label="Ý nghĩa">{c.meaning}</Row>
            <Row label="Pinyin">
              <span className="zh font-semibold">{c.pinyin || "—"}</span>
            </Row>
            <Row label="Cấp độ">
              {c.level && c.level !== "?" ? (
                <span className="pill pill-active text-xs">{c.level}</span>
              ) : (
                c.level
              )}
            </Row>
            <Row label="Số nét">{String(c.strokes)}</Row>
            <Row label="Bộ thủ">
              {radicalLinked ? (
                <Link
                  href={"/hanzi/" + encodeURIComponent(radical)}
                  className="zh text-[var(--nhai-accent)] hover:underline"
                >
                  {radical}
                </Link>
              ) : (
                <span className="zh">{radical}</span>
              )}
            </Row>
            <Row label="Cấu tạo từ">
              {compParts.length === 0
                ? "—"
                : compParts.map((part, i) => (
                    <span key={i}>
                      {i > 0 && " "}
                      {hanziChars[part] ? (
                        <Link
                          href={"/hanzi/" + encodeURIComponent(part)}
                          className="zh text-[var(--nhai-accent)] hover:underline"
                        >
                          {part}
                        </Link>
                      ) : (
                        <span className="zh">{part}</span>
                      )}
                    </span>
                  ))}
            </Row>
            <Row label="Loại chữ">
              {c.type && c.type !== "—" ? <span className="pill text-xs">{c.type}</span> : c.type}
            </Row>
          </div>
        </div>

        {/* Sidebar phải: từ vựng */}
        <aside className="lg:col-span-3 order-3 space-y-4">
          <div className="card shadow-neo p-4">
            <h2 className="font-extrabold text-lg mb-3">Từ vựng trong sách</h2>
            <div className="space-y-3">
              {(c.vocabInBook || []).length === 0 ? (
                <p className="text-sm text-[var(--nhai-muted)] font-semibold">
                  Chưa có từ vựng trong sách cho chữ này.
                </p>
              ) : (
                c.vocabInBook!.map((v, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <Link href={v.link || "#"} className="zh text-lg font-bold hover:text-[var(--nhai-main)]">
                        {v.word}
                      </Link>{" "}
                      <span className="zh text-sm text-[var(--nhai-muted)]">({v.py})</span>
                      <div className="text-xs font-bold text-[var(--nhai-muted)] mt-0.5">- {v.hv}</div>
                      <div className="text-sm">- {v.vi}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="pill text-xs">HSK 1</span>
                      <button
                        type="button"
                        className="btn-ghost w-8 h-8 text-sm"
                        title="Phát âm"
                        onClick={() => speak(v.word, { lang: "zh-CN" })}
                      >
                        🔊
                      </button>
                      {v.link && (
                        <Link
                          href={v.link}
                          className="text-xs font-semibold text-[var(--nhai-accent)] hover:underline"
                        >
                          → Bài học
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="card shadow-neo p-4">
            <h2 className="font-extrabold text-lg mb-3">Từ vựng thực chiến</h2>
            <div className="space-y-2">
              {(c.practical || []).length === 0 ? (
                <p className="text-sm text-[var(--nhai-muted)] font-semibold">
                  Chưa có từ vựng thực chiến cho chữ này.
                </p>
              ) : (
                c.practical!.map((p, i) => (
                  <div key={i} className="flex items-baseline gap-2 text-sm">
                    <Link
                      href={"/dictionary?q=" + encodeURIComponent(p.word)}
                      className="zh font-bold text-base hover:text-[var(--nhai-main)] shrink-0"
                    >
                      {p.word}
                    </Link>
                    <span className="zh text-xs text-[var(--nhai-muted)] shrink-0">{p.py}</span>
                    <span className="text-[var(--nhai-border)]">—</span>
                    <span className="text-[var(--nhai-muted)]">{p.vi}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="text-right">
            <Link
              href={"/hanzi/" + encodeURIComponent(next)}
              className="font-bold text-[var(--nhai-main)] hover:underline"
            >
              Chữ sau {next} →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
