import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <section className="flex justify-center py-12">
        <Card className="p-10 text-center max-w-md w-full">
          <h1 className="text-5xl font-extrabold tracking-tight mb-2">404</h1>
          <p className="text-sm text-text-secondary mb-6">
            Trang bạn tìm không tồn tại hoặc đã bị chuyển.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-11 px-5 rounded-control border border-transparent bg-action-primary text-white font-semibold hover:bg-action-primary-hover active:bg-action-primary-active"
          >
            Về trang chủ
          </Link>
        </Card>
      </section>
    </main>
  );
}
