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
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Volume2, Search, Pencil } from "@/components/ui/icon";

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
    <Button
      type="button"
      variant={on ? "primary" : "secondary"}
      size="sm"
      aria-pressed={on ? "true" : "false"}
      onClick={onClick}
    >
      {label}
    </Button>
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
          className="text-sm font-semibold text-text-secondary hover:text-action-primary"
        >
          ← Phân tích Hán tự
        </Link>
      </header>

      <div className="grid lg:grid-cols-10 gap-6">
        {/* Sidebar trái: tìm + vẽ */}
        <aside className="lg:col-span-3 space-y-4 order-2 lg:order-1">
          <Card className="p-4">
            <h2 className="font-extrabold mb-2 inline-flex items-center gap-2">
              <Search size={18} strokeWidth={1.5} aria-hidden="true" /> Tìm chữ Hán
            </h2>
            <SearchCard go={go} />
          </Card>
          <Card className="p-4">
            <h2 className="font-extrabold mb-2 inline-flex items-center gap-2">
              <Pencil size={18} strokeWidth={1.5} aria-hidden="true" /> Vẽ chữ Hán
            </h2>
            <DrawPad size={240} onPick={go} />
          </Card>
        </aside>

        {/* Trung tâm */}
        <div className="lg:col-span-4 order-1 lg:order-2">
          <div className="relative mx-auto w-[260px] h-[260px]">
            <Card className="absolute inset-0 flex items-center justify-center">
              <span className="zh font-black text-[64px] leading-none">{char}</span>
            </Card>
            <div ref={writerRef} className="absolute inset-0"></div>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => player.play()}>
              Xem lại thứ tự nét
            </Button>
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
            <Card className="p-3 mt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-text-secondary mb-2">
                Chữ chứa chữ này
              </p>
              <div className="flex flex-wrap gap-2">
                {related.length === 0 ? (
                  <span className="text-sm text-text-secondary font-semibold">Không có chữ nào.</span>
                ) : (
                  related.map((k) => (
                    <Link
                      key={k}
                      href={"/hanzi/" + encodeURIComponent(k)}
                      className="inline-flex items-center justify-center w-14 h-14 text-2xl zh font-bold rounded-control border border-border-default bg-surface-elevated hover:border-action-primary"
                    >
                      {k}
                    </Link>
                  ))
                )}
              </div>
            </Card>
          )}

          <div className="flex items-center gap-3 flex-wrap mt-5">
            <h1 className="text-4xl font-extrabold">
              {char} - {c.hanViet}
            </h1>
            <IconButton
              label={"Phát âm " + char}
              variant="ghost"
              onClick={() => speak(char, { lang: "zh-CN" })}
            >
              <Volume2 size={20} strokeWidth={1.5} aria-hidden="true" />
            </IconButton>
          </div>
          <Link
            href="/sound-rules"
            className="inline-block mt-2 text-sm font-semibold text-action-primary hover:underline"
          >
            → Quy tắc chuyển âm
          </Link>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Âm Hán Việt">
              <span className="font-bold">{c.hanViet}</span>
              {c.hanVietAlt && <span className="text-text-secondary"> (còn đọc: {c.hanVietAlt})</span>}
            </Row>
            <Row label="Ý nghĩa">{c.meaning}</Row>
            <Row label="Pinyin">
              <span className="zh font-semibold">{c.pinyin || "—"}</span>
            </Row>
            <Row label="Cấp độ">
              {c.level && c.level !== "?" ? (
                <Chip selected className="text-xs">{c.level}</Chip>
              ) : (
                c.level
              )}
            </Row>
            <Row label="Số nét">{String(c.strokes)}</Row>
            <Row label="Bộ thủ">
              {radicalLinked ? (
                <Link
                  href={"/hanzi/" + encodeURIComponent(radical)}
                  className="zh text-action-primary hover:underline"
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
                          className="zh text-action-primary hover:underline"
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
              {c.type && c.type !== "—" ? <Chip className="text-xs">{c.type}</Chip> : c.type}
            </Row>
          </div>
        </div>

        {/* Sidebar phải: từ vựng */}
        <aside className="lg:col-span-3 order-3 space-y-4">
          <Card className="p-4">
            <h2 className="font-extrabold text-lg mb-3">Từ vựng trong sách</h2>
            <div className="space-y-3">
              {(c.vocabInBook || []).length === 0 ? (
                <p className="text-sm text-text-secondary font-semibold">
                  Chưa có từ vựng trong sách cho chữ này.
                </p>
              ) : (
                c.vocabInBook!.map((v, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <Link href={v.link || "#"} className="zh text-lg font-bold hover:text-action-primary">
                        {v.word}
                      </Link>{" "}
                      <span className="zh text-sm text-text-secondary">({v.py})</span>
                      <div className="text-xs font-bold text-text-secondary mt-0.5">- {v.hv}</div>
                      <div className="text-sm">- {v.vi}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Chip className="text-xs">HSK 1</Chip>
                      <IconButton
                        label="Phát âm"
                        variant="ghost"
                       
                        onClick={() => speak(v.word, { lang: "zh-CN" })}
                      >
                        <Volume2 size={16} strokeWidth={1.5} aria-hidden="true" />
                      </IconButton>
                      {v.link && (
                        <Link
                          href={v.link}
                          className="text-xs font-semibold text-action-primary hover:underline"
                        >
                          → Bài học
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="font-extrabold text-lg mb-3">Từ vựng thực chiến</h2>
            <div className="space-y-2">
              {(c.practical || []).length === 0 ? (
                <p className="text-sm text-text-secondary font-semibold">
                  Chưa có từ vựng thực chiến cho chữ này.
                </p>
              ) : (
                c.practical!.map((p, i) => (
                  <div key={i} className="flex items-baseline gap-2 text-sm">
                    <Link
                      href={"/dictionary?q=" + encodeURIComponent(p.word)}
                      className="zh font-bold text-base hover:text-action-primary shrink-0"
                    >
                      {p.word}
                    </Link>
                    <span className="zh text-xs text-text-secondary shrink-0">{p.py}</span>
                    <span className="text-border-strong">—</span>
                    <span className="text-text-secondary">{p.vi}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
          <div className="text-right">
            <Link
              href={"/hanzi/" + encodeURIComponent(next)}
              className="font-bold text-action-primary hover:underline"
            >
              Chữ sau {next} →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
