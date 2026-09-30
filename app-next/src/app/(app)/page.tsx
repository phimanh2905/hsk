import Link from "next/link";
import { books } from "@/content/courses";
import ContinueCard from "@/components/home/continue-card";

export const metadata = { title: "Trang chủ", description: "Tiếp tục hành trình từ vựng tiếng Trung của bạn — mỗi ngày một chút là đủ." };

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">Chào bạn 👋</h1>
        <p className="text-nhai-muted">Tiếp tục hành trình từ vựng tiếng Trung của bạn — mỗi ngày một chút là đủ.</p>
      </section>
      <section className="card p-4">
        <p>Vào nhóm học cùng mọi người nhé:</p>
        <a className="text-nhai-main font-semibold underline" href="https://www.facebook.com/groups/nhaihsk" target="_blank" rel="noreferrer">
          Nhai tiếng Trung mỗi ngày
        </a>
      </section>
      <ContinueCard />
      <section>
        <h2 className="text-xl font-bold">HSK 3.0</h2>
        <p className="text-nhai-muted text-sm">Bản cải tiến</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {books.map((b) => (
            <Link key={b.slug} href={`/course/${b.slug}`}
              className="card shadow-neo p-4 hover:-translate-y-px transition-transform">
              <div className="font-bold">{b.name}</div>
              <div className="text-sm text-nhai-muted">{b.cardMeta}</div>
            </Link>
          ))}
        </div>
      </section>
      <footer className="text-xs text-nhai-muted text-center py-6">
        Nhai tiếng Trung mỗi ngày — facebook.com/groups/nhaihsk
      </footer>
    </div>
  );
}
