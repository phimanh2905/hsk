"use client";

/* Swap hero: chưa onboarding + progress 0 → flow onboarding; còn lại → HeroAction cũ. */

import { useEffect, useState } from "react";
import HeroAction from "./hero-action";
import OnboardingHero from "./onboarding-hero";
import { progressStore, type OnboardingState } from "@/lib/store/progress-store";
import { useHomeSummary } from "@/lib/home-summary";

export default function HomeHero() {
  const s = useHomeSummary();
  const [ob, setOb] = useState<OnboardingState | null>(() => progressStore.getOnboarding());
  useEffect(() => {
    const sync = () => setOb(progressStore.getOnboarding());
    window.addEventListener("bye:progress", sync);
    return () => window.removeEventListener("bye:progress", sync);
  }, []);
  /* Hydration-safe: useHomeSummary.mounted = false ở lần render đầu (cả SSR lẫn client),
     nên giá trị localStorage của ob chỉ ảnh hưởng sau khi mounted. */
  if (!s.mounted) return null;
  if (ob == null && s.lessonsDone === 0) {
    return <OnboardingHero onDone={() => setOb(progressStore.getOnboarding())} />;
  }
  return <HeroAction />;
}
