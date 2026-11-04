import Link from "next/link";
import GlanceGreeting from "@/components/home/glance-greeting";
import HomeHero from "@/components/home/home-hero";
import LandingIntro from "@/components/home/landing-intro";
import HabitLoop from "@/components/home/habit-loop";
import ProgressMatrix from "@/components/home/progress-matrix";

export const metadata = {
  title: "Trang chủ",
  description: "Hành trình HSK mỗi ngày — một chút là đủ.",
};

/* Glance header tĩnh (server-safe): CTA nhóm Facebook giữ lại từ trang chủ cũ,
   phần số liệu (chào theo giờ, streak, goal) là client island GlanceGreeting. */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      <GlanceGreeting />
      <HomeHero />
      <LandingIntro />
      <HabitLoop />
      <ProgressMatrix />
      <footer className="py-4 text-center text-xs text-text-secondary">
        Học cùng cộng đồng:{" "}
        <Link
          className="font-semibold text-action-primary underline"
          href="https://www.facebook.com/groups/byehsk"
          target="_blank"
          rel="noreferrer"
        >
          Bye tiếng Trung mỗi ngày
        </Link>
      </footer>
    </div>
  );
}
