import Link from "next/link";
import { books } from "@/content/courses";
import { Card } from "@/components/ui/card";
import ContinueCard from "@/components/home/continue-card";

export const metadata = { title: "Trang chủ", description: "Tiếp tục hành trình từ vựng tiếng Trung của bạn — mỗi ngày một chút là đủ." };

export default function HomePage() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 space-y-8">
      <section>
        <h1 className="text-2xl font-bold">Chào bạn</h1>
        <p className="text-text-secondary">Tiếp tục hành trình từ vựng tiếng Trung của bạn — mỗi ngày một chút là đủ.</p>
      </section>
      <Card className="p-4">
        <p>Vào nhóm học cùng mọi người nhé:</p>
        <a className="text-action-primary font-semibold underline" href="https://www.facebook.com/groups/nhaihsk" target="_blank" rel="noreferrer">
          Nhai tiếng Trung mỗi ngày
        </a>
      </Card>
      <ContinueCard />
      <section>
        <h2 className="text-xl font-bold">HSK 3.0</h2>
        <p className="text-text-secondary text-sm">Bản cải tiến</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {books.map((b) => (
            <Link key={b.slug} href={`/course/${b.slug}`}
              className="block rounded-card border border-border-default bg-surface-elevated p-4 shadow-xs hover:-translate-y-px transition-transform">
              <div className="font-bold">{b.name}</div>
              <div className="text-sm text-text-secondary">{b.cardMeta}</div>
            </Link>
          ))}
        </div>
      </section>
      <footer className="text-xs text-text-secondary text-center py-6">
        Nhai tiếng Trung mỗi ngày — facebook.com/groups/nhaihsk
      </footer>
    </div>
  );
}
