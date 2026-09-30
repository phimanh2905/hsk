"use client";

/* Stepper 6 bước + nội dung từng bước — port 1:1 từ clone/js/roadmap-pinyin.js
   (renderStepper + renderStep) sang React. `?step=n` qua useSearchParams
   (page bọc Suspense). 🔊 dùng useTts (Task 5) thay NHAI.speak. */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { roadmapPinyinSteps } from "@/content/roadmapPinyin";
import { useTts } from "@/lib/tts/use-tts";

function SpeakBtn({ text }: { text: string }) {
  const { speak } = useTts();
  return (
    <button
      type="button"
      onClick={() => speak(text, { lang: "zh-CN", rate: 0.8 })}
      title="Nghe phát âm"
      className="btn-ghost w-9 h-9 text-sm shrink-0"
    >
      🔊
    </button>
  );
}

function StepBody({ index }: { index: number }) {
  const s = roadmapPinyinSteps[index];

  if (s.key === "initials" && s.initials) {
    return (
      <>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
          {s.initials.map((x) => (
            <div key={x} className="card p-3 flex flex-col items-center gap-1">
              <span className="text-2xl font-extrabold tracking-wide">{x}</span>
              <span className="text-[10px] text-nhai-muted">thanh mẫu</span>
              <SpeakBtn text={x} />
            </div>
          ))}
        </div>
        {s.theory ? <p className="text-sm text-nhai-muted card p-4">{s.theory}</p> : null}
      </>
    );
  }

  if (s.key === "finals" && s.vowels) {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        {s.vowels.map((v) => (
          <div key={v.s} className="card p-4 flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-nhai-main text-white font-extrabold text-xl flex items-center justify-center shrink-0">
              {v.s}
            </span>
            <div className="min-w-0">
              <div className="font-bold mb-0.5">
                <span className="zh">{v.zh}</span> · {v.s}
              </div>
              <p className="text-sm text-nhai-muted">{v.vi}</p>
            </div>
            <SpeakBtn text={v.s} />
          </div>
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
                <div key={it.s} className="card p-3 flex items-center gap-2">
                  <span className="text-xl font-extrabold">{it.s}</span>
                  <div className="min-w-0 text-sm">
                    <span className="zh font-bold">{it.zh}</span>{" "}
                    <span className="text-nhai-muted">{it.vi}</span>
                  </div>
                  <SpeakBtn text={it.s} />
                </div>
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
          <div key={t.name} className="card p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl font-extrabold text-nhai-main w-12 text-center">{t.mark}</span>
              <span className="text-2xl text-nhai-muted" aria-hidden="true">
                {t.arrow}
              </span>
              <span className="font-extrabold">{t.name}</span>
            </div>
            <p className="text-sm text-nhai-muted mb-2">{t.desc}</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold">{t.py}</span>
              <span className="zh text-xl font-bold">{t.zh}</span>
              <span className="text-sm text-nhai-muted">{t.vi}</span>
            </div>
            <div className="mt-2">
              <SpeakBtn text={t.py} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (s.key === "rules" && s.rules) {
    return (
      <div className="space-y-3">
        {s.rules.map((r) => (
          <div key={r.rule} className="card p-4">
            <div className="font-extrabold mb-1">📌 {r.rule}</div>
            <p className="text-sm text-nhai-muted mb-1">{r.desc}</p>
            <p className="text-sm font-semibold zh">{r.ex}</p>
          </div>
        ))}
      </div>
    );
  }

  /* recap */
  return (
    <div className="card shadow-neo p-6 text-center mb-4">
      <div className="text-4xl mb-2">🎉</div>
      <p className="text-sm text-nhai-muted mb-5">{s.note}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {s.links?.map((l) => (
          <Link key={l.href} href={l.href} className="btn-main px-5 py-2.5">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
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
              className={
                "px-3 py-2 text-xs sm:text-sm font-bold rounded-lg border-2 " +
                (n === step ? "btn-main" : "btn-ghost")
              }
            >
              {n} · {st.label}
            </Link>
          );
        })}
      </nav>

      {/* Nội dung bước */}
      <section className="mb-4">
        <h2 className="text-2xl font-extrabold mb-1">{s.title}</h2>
        <p className="text-sm text-nhai-muted">{s.intro}</p>
      </section>
      <section className="mb-6">
        <StepBody index={step - 1} />
      </section>

      {/* Prev / next */}
      <nav className="flex justify-between gap-3">
        {step > 1 ? (
          <Link href={`/roadmap/pinyin?step=${step - 1}`} className="btn-ghost px-4 py-2 text-sm">
            ← Bước trước
          </Link>
        ) : (
          <Link href="/roadmap" className="btn-ghost px-4 py-2 text-sm">
            ← Về lộ trình
          </Link>
        )}
        {step < roadmapPinyinSteps.length ? (
          <Link href={`/roadmap/pinyin?step=${step + 1}`} className="btn-main px-4 py-2 text-sm">
            Bước sau →
          </Link>
        ) : (
          <Link href="/course/hsk1" className="btn-main px-4 py-2 text-sm">
            Vào HSK 1 →
          </Link>
        )}
      </nav>
    </div>
  );
}
