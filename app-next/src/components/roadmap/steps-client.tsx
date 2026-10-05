"use client";

/* Stepper 6 bước + nội dung từng bước — port 1:1 từ clone/js/roadmap-pinyin.js
   (renderStepper + renderStep) sang React. `?step=n` qua useSearchParams
   (page bọc Suspense). Nút loa = IconButton + Volume2 (qua useTts thay BYE.speak). */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { roadmapPinyinSteps } from "@/content/roadmapPinyin";
import { useTts } from "@/lib/tts/use-tts";
import { Volume2, ICON_STROKE } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

const LINK_BTN =
  "inline-flex items-center justify-center rounded-control border font-semibold min-h-11 px-4 text-sm " +
  "bg-action-primary text-white border-transparent hover:bg-action-primary-hover active:bg-action-primary-active " +
  "focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2";
const LINK_BTN_SECONDARY =
  "inline-flex items-center justify-center rounded-control border font-semibold min-h-11 px-4 text-sm " +
  "bg-surface-elevated text-text-primary border-border-default hover:border-action-primary hover:text-action-primary " +
  "focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2";

function SpeakBtn({ text }: { text: string }) {
  const { speak } = useTts();
  return (
    <IconButton
      label="Nghe phát âm"
      onClick={() => speak(text, { lang: "zh-CN", rate: 0.8 })}
      className="text-sm shrink-0"
    >
      <Volume2 size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
    </IconButton>
  );
}

function StepBody({ index }: { index: number }) {
  const s = roadmapPinyinSteps[index];

  if (s.key === "initials" && s.initials) {
    return (
      <>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
          {s.initials.map((x) => (
            <Card key={x} className="p-3 flex flex-col items-center gap-1">
              <span className="text-2xl font-extrabold tracking-wide">{x}</span>
              <span className="text-[10px] text-text-secondary">thanh mẫu</span>
              <SpeakBtn text={x} />
            </Card>
          ))}
        </div>
        {s.theory ? <Card className="p-4 mb-0"><p className="text-sm text-text-secondary">{s.theory}</p></Card> : null}
      </>
    );
  }

  if (s.key === "finals" && s.vowels) {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        {s.vowels.map((v) => (
          <Card key={v.s} className="p-4 flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-action-primary text-white font-extrabold text-xl flex items-center justify-center shrink-0">
              {v.s}
            </span>
            <div className="min-w-0">
              <div className="font-bold mb-0.5">
                <span className="zh">{v.zh}</span> · {v.s}
              </div>
              <p className="text-sm text-text-secondary">{v.vi}</p>
            </div>
            <SpeakBtn text={v.s} />
          </Card>
        ))}
      </div>
    );
  }

  if (s.key === "compound" && s.groups) {
    return (
      <>
        {s.groups.map((g) => (
          <div key={g.name}>
            <h3 className="font-extrabold mb-2">{g.name}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {g.items.map((it) => (
                <Card key={it.s} className="p-3 flex items-center gap-2">
                  <span className="text-xl font-extrabold">{it.s}</span>
                  <div className="min-w-0 text-sm">
                    <span className="zh font-bold">{it.zh}</span>{" "}
                    <span className="text-text-secondary">{it.vi}</span>
                  </div>
                  <SpeakBtn text={it.s} />
                </Card>
              ))}
            </div>
          </div>
        ))}
      </>
    );
  }

  if (s.key === "tones" && s.tones) {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        {s.tones.map((t) => (
          <Card key={t.name} className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl font-extrabold text-action-primary w-12 text-center">{t.mark}</span>
              <span className="text-2xl text-text-secondary" aria-hidden="true">
                {t.arrow}
              </span>
              <span className="font-extrabold">{t.name}</span>
            </div>
            <p className="text-sm text-text-secondary mb-2">{t.desc}</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold">{t.py}</span>
              <span className="zh text-xl font-bold">{t.zh}</span>
              <span className="text-sm text-text-secondary">{t.vi}</span>
            </div>
            <div className="mt-2">
              <SpeakBtn text={t.py} />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (s.key === "rules" && s.rules) {
    return (
      <div className="space-y-3">
        {s.rules.map((r) => (
          <Card key={r.rule} className="p-4">
            <div className="font-extrabold mb-1">{r.rule}</div>
            <p className="text-sm text-text-secondary mb-1">{r.desc}</p>
            <p className="text-sm font-semibold zh">{r.ex}</p>
          </Card>
        ))}
      </div>
    );
  }

  /* recap — restrained, không celebration */
  return (
    <Card className="p-6 text-center mb-4">
      <p className="text-sm text-text-secondary mb-5">{s.note}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {s.links?.map((l) => (
          <Link key={l.href} href={l.href} className={LINK_BTN}>
            {l.label}
          </Link>
        ))}
      </div>
    </Card>
  );
}

export default function StepsClient(): React.JSX.Element {
  const sp = useSearchParams();
  const raw = parseInt(sp.get("step") ?? "1", 10);
  const step = Number.isNaN(raw) || raw < 1 || raw > roadmapPinyinSteps.length ? 1 : raw;
  const s = roadmapPinyinSteps[step - 1];

  return (
    <div>
      {/* Stepper ngang */}
      <nav className="flex flex-wrap gap-2 mb-6">
        {roadmapPinyinSteps.map((st, i) => {
          const n = i + 1;
          return (
            <Link
              key={st.key}
              href={`/roadmap/pinyin?step=${n}`}
              aria-current={n === step ? "step" : undefined}
              className={cn(
                "inline-flex items-center rounded-control border font-semibold px-3 py-2 text-xs sm:text-sm",
                n === step
                  ? "bg-action-primary text-white border-transparent hover:bg-action-primary-hover"
                  : "bg-surface-elevated text-text-primary border-border-default hover:border-action-primary hover:text-action-primary",
              )}
            >
              {n} · {st.label}
            </Link>
          );
        })}
      </nav>

      {/* Nội dung bước */}
      <section className="mb-4">
        <h2 className="text-2xl font-extrabold mb-1">{s.title}</h2>
        <p className="text-sm text-text-secondary">{s.intro}</p>
      </section>
      <section className="mb-6">
        <StepBody index={step - 1} />
      </section>

      {/* Prev / next */}
      <nav className="flex justify-between gap-3">
        {step > 1 ? (
          <Link href={`/roadmap/pinyin?step=${step - 1}`} className={LINK_BTN_SECONDARY}>
            ← Bước trước
          </Link>
        ) : (
          <Link href="/roadmap" className={LINK_BTN_SECONDARY}>
            ← Về lộ trình
          </Link>
        )}
        {step < roadmapPinyinSteps.length ? (
          <Link href={`/roadmap/pinyin?step=${step + 1}`} className={LINK_BTN}>
            Bước sau →
          </Link>
        ) : (
          <Link href="/course/hsk1" className={LINK_BTN}>
            Vào HSK 1 →
          </Link>
        )}
      </nav>
    </div>
  );
}
