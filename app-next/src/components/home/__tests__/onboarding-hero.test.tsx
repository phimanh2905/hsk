// app-next/src/components/home/__tests__/onboarding-hero.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProgressStore } from "@/lib/store/progress-store";

const { PlacementTestMock } = vi.hoisted(() => ({ PlacementTestMock: vi.fn() }));
vi.mock("../placement-test", () => ({ default: PlacementTestMock }));

import OnboardingHero from "../onboarding-hero";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function goalStep() {
  return render(<OnboardingHero onDone={() => {}} />);
}

describe("OnboardingHero", () => {
  it("bước 1: chọn goal + minutes rồi Tiếp tục → bước offer", () => {
    goalStep();
    expect(screen.getByTestId("onboarding-hero")).toBeTruthy();
    fireEvent.click(screen.getByTestId("onboarding-goal-hsk5"));
    fireEvent.click(screen.getByTestId("onboarding-minutes-15"));
    fireEvent.click(screen.getByTestId("onboarding-next"));
    expect(screen.getByTestId("onboarding-take-test")).toBeTruthy();
  });

  it("bước 2: Bỏ qua test → setOnboarding không placement + onDone", () => {
    const onDone = vi.fn();
    render(<OnboardingHero onDone={onDone} />);
    fireEvent.click(screen.getByTestId("onboarding-goal-hsk2"));
    fireEvent.click(screen.getByTestId("onboarding-minutes-10"));
    fireEvent.click(screen.getByTestId("onboarding-next"));
    fireEvent.click(screen.getByTestId("onboarding-skip-test"));
    const s = new ProgressStore().getOnboarding();
    expect(s).toMatchObject({ goal: "hsk2", minutes: 10 });
    expect(s?.placement).toBeUndefined();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("bước 2: chọn Làm test → render PlacementTest; onComplete → lưu + màn result", () => {
    PlacementTestMock.mockImplementation(({ onComplete }: { onComplete: (r: unknown) => void }) => (
      <button data-testid="mock-test-finish" onClick={() => onComplete({ suggestedStage: "hsk3", blocks: { hsk1: { correct: 3, total: 3 }, hsk2: { correct: 2, total: 3 } }, seed: 9 })} />
    ));
    render(<OnboardingHero onDone={() => {}} />);
    fireEvent.click(screen.getByTestId("onboarding-goal-hsk5"));
    fireEvent.click(screen.getByTestId("onboarding-minutes-30"));
    fireEvent.click(screen.getByTestId("onboarding-next"));
    fireEvent.click(screen.getByTestId("onboarding-take-test"));
    fireEvent.click(screen.getByTestId("mock-test-finish"));
    const s = new ProgressStore().getOnboarding();
    expect(s?.placement?.suggestedStage).toBe("hsk3");
    expect(screen.getByTestId("onboarding-result")).toBeTruthy();
    expect(screen.getByTestId("onboarding-start-journey").getAttribute("href")).toBe("/roadmap");
  });

  it("Bỏ qua toàn flow (bước 1) → setOnboarding skipped + onDone", () => {
    const onDone = vi.fn();
    render(<OnboardingHero onDone={onDone} />);
    fireEvent.click(screen.getByTestId("onboarding-skip"));
    const s = new ProgressStore().getOnboarding();
    expect(s?.skipped).toBe(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
