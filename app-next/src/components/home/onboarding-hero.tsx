"use client";

/* Onboarding hero 3 bước (spec 2026-11-04 §3): goal → offer test → test/result.
   Toàn bộ optional — Bỏ qua mọi lúc. Lưu bye.onboarding.v1 qua progressStore. */

import { useState } from "react";
import Link from "next/link";
import { Play, Sparkles, ICON_STROKE } from "@/components/ui/icon";
import { progressStore, type GoalLevel, type OnboardingState } from "@/lib/store/progress-store";
import PlacementTest, { type PlacementResult } from "./placement-test";

const btnPrimary =
  "inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-control border border-transparent bg-action-primary px-6 text-[15px] font-semibold text-white hover:bg-action-primary-hover active:bg-action-primary-active focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2 sm:w-auto";
const btnGhost =
  "inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-control border border-border-default bg-surface-muted px-6 text-[15px] font-semibold text-text-primary hover:bg-surface-elevated hover:border-border-strong focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2 sm:w-auto";
const chip =
  "min-h-12 rounded-control border px-4 text-[14px] font-semibold focus-visible:outline-none focus-visible:ring-3 ring-action-focus";

const STAGE_LABEL: Record<string, string> = {
  pinyin: "Nền tảng Pinyin",
  hsk1: "HSK 1", hsk2: "HSK 2", hsk3: "HSK 3", hsk4: "HSK 4", hsk5: "HSK 5",
};

type Step = "goal" | "offer" | "test" | "result";

export default function OnboardingHero({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("goal");
  const [goal, setGoal] = useState<GoalLevel>("hsk5");
  const [minutes, setMinutes] = useState<10 | 15 | 30>(15);
  const [result, setResult] = useState<PlacementResult | null>(null);

  const save = (extra: Partial<OnboardingState> = {}) => {
    progressStore.setOnboarding({ goal, minutes, at: Date.now(), ...extra });
  };

  return (
    <section
      data-testid="onboarding-hero"
      aria-label="Bắt đầu hành trình"
      className="relative overflow-hidden rounded-card border border-border-default bg-surface-elevated p-5 shadow-xs md:p-[22px]"
    >
      <span aria-hidden="true"
        className="zh pointer-events-none absolute -top-6 right-2 select-none text-[140px] font-extrabold leading-none text-text-primary opacity-[0.055] md:text-[210px]">
        {step === "result" ? "路" : "学"}
      </span>
      <div className="relative z-[1]">
        {step === "goal" && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">BẮT ĐẦU HÀNH TRÌNH</p>
            <h2 className="mt-3 text-xl font-bold tracking-tight md:text-2xl">
              Bạn học tiếng Trung để đạt HSK nào?
            </h2>
            <div className="mt-4 flex flex-wrap gap-2.5" role="group" aria-label="Chọn đích HSK">
              {(["hsk1", "hsk2", "hsk3", "hsk4", "hsk5"] as GoalLevel[]).map((g) => (
                <button key={g} data-testid={`onboarding-goal-${g}`} onClick={() => setGoal(g)}
                  aria-pressed={goal === g}
                  className={`${chip} ${goal === g ? "border-action-primary bg-action-primary text-white" : "border-border-default bg-surface-muted text-text-primary hover:bg-surface-elevated"}`}>
                  {STAGE_LABEL[g]}
                </button>
              ))}
            </div>
            <p className="mt-4 text-[13.5px] text-text-secondary">Mỗi ngày bạn có thể học bao nhiêu phút?</p>
            <div className="mt-2 flex flex-wrap gap-2.5" role="group" aria-label="Chọn phút mỗi ngày">
              {([10, 15, 30] as const).map((m) => (
                <button key={m} data-testid={`onboarding-minutes-${m}`} onClick={() => setMinutes(m)}
                  aria-pressed={minutes === m}
                  className={`${chip} ${minutes === m ? "border-action-primary bg-action-primary text-white" : "border-border-default bg-surface-muted text-text-primary hover:bg-surface-elevated"}`}>
                  {m} phút
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button data-testid="onboarding-next" onClick={() => setStep("offer")} className={btnPrimary}>
                Tiếp tục
              </button>
              <button data-testid="onboarding-skip" onClick={() => { save({ skipped: 1 }); onDone(); }} className={btnGhost}>
                Bỏ qua
              </button>
            </div>
          </>
        )}

        {step === "offer" && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">MỤC TIÊU CỦA BẠN</p>
            <h2 className="mt-3 text-xl font-bold tracking-tight md:text-2xl">
              Đích: {STAGE_LABEL[goal]} · {minutes} phút/ngày
            </h2>
            <p className="mt-2 text-[13.5px] text-text-secondary">
              Làm nhanh bài test 3–15 câu để biết bạn nên bắt đầu từ trạm nào — hoặc bắt đầu từ đầu cùng mọi người.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button data-testid="onboarding-take-test" onClick={() => setStep("test")} className={btnPrimary}>
                <Sparkles size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
                Làm test trình độ (~3 phút)
              </button>
              <button data-testid="onboarding-skip-test" onClick={() => { save(); onDone(); }} className={btnGhost}>
                Bỏ qua — bắt đầu từ đầu
              </button>
            </div>
          </>
        )}

        {step === "test" && (
          <PlacementTest
            onCancel={() => setStep("offer")}
            onComplete={(r) => { save({ placement: { ...r, at: Date.now() } }); setResult(r); setStep("result"); }}
          />
        )}

        {step === "result" && result && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">KẾT QUẢ TEST</p>
            <h2 data-testid="onboarding-result" className="mt-3 text-xl font-bold tracking-tight md:text-2xl">
              Bạn nên bắt đầu từ <span className="zh">{STAGE_LABEL[result.suggestedStage]}</span>
            </h2>
            <p className="mt-2 text-[13.5px] text-text-secondary">
              Trạm thấp hơn vẫn mở tự do — bạn có thể quay lại ôn bất cứ lúc nào.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link data-testid="onboarding-start-journey" href="/roadmap" className={btnPrimary}>
                <Play size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="fill-current" />
                Vào Journey
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
