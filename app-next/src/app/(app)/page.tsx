import Link from "next/link";
import GlanceGreeting from "@/components/home/glance-greeting";
import HeroAction from "@/components/home/hero-action";
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
      <HeroAction />
      <HabitLoop />
      <ProgressMatrix />
      <footer className="py-4 text-center text-xs text-text-secondary">
        Học cùng cộng đồng:{" "}
        <Link
          className="font-semibold text-action-primary underline"
          href="https://www.facebook.com/groups/nhaihsk"
          target="_blank"
          rel="noreferrer"
        >
          Nhai tiếng Trung mỗi ngày
        </Link>
      </footer>
    </div>
  );
}
