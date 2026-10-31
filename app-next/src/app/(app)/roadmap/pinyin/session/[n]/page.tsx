/* Route buổi học lộ trình pinyin (E3) — /roadmap/pinyin/session/[n].
   SSG: generateStaticParams từ roadmapSessions (1..8), ngoài range → 404. */

import { notFound } from "next/navigation";
import SessionClient from "@/components/roadmap/session-client";
import { roadmapSessions } from "@/content/roadmap";

export const dynamicParams = false;

export function generateStaticParams(): { n: string }[] {
  return roadmapSessions.map((_, i) => ({ n: String(i + 1) }));
}

export default async function Page({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const num = Number(n);
  if (!Number.isInteger(num) || num < 1 || num > roadmapSessions.length) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <SessionClient n={num} />
    </main>
  );
}
