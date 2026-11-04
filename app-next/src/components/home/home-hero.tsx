"use client";

/* Swap hero: chưa onboarding + progress 0 → flow onboarding; còn lại → HeroAction cũ. */

import { useState } from "react";
import HeroAction from "./hero-action";
import OnboardingHero from "./onboarding-hero";
import { progressStore, type OnboardingState } from "@/lib/store/progress-store";
import { useHomeSummary } from "@/lib/home-summary";

export default function HomeHero() {
  const s = useHomeSummary();
  /* Chốt điều kiện onboarding MỘT lần lúc mount: không re-read trên event
     "bye:progress" nữa, nếu không save({placement}) của bước "test" sẽ swap
     hero ngay trước khi user kịp nhìn màn kết quả. Hero chỉ thoát sang
     HeroAction khi OnboardingHero tự gọi onDone() (click "Vào Journey"). */
  const [ob] = useState<OnboardingState | null>(() => progressStore.getOnboarding());
  const [done, setDone] = useState(false);
  /* Hydration-safe: useHomeSummary.mounted = false ở lần render đầu (cả SSR lẫn client),
     nên giá trị localStorage của ob chỉ ảnh hưởng sau khi mounted. */
  if (!s.mounted) return null;
  if (!done && ob == null && s.lessonsDone === 0) {
    return <OnboardingHero onDone={() => setDone(true)} />;
  }
  return <HeroAction />;
}
