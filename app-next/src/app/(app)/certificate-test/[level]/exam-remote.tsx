"use client";

/* ExamRemote — SSG gate cho /certificate-test/[level]: fetch vocab qua
   /api/v1/content/vocab on-mount, build đề bằng generateExam (pure) rồi render
   ExamRunner. Page tĩnh — không đọc D1 lúc build. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { generateExam } from "@/lib/exam/generate";
import type { Exam } from "@/lib/exam/types";
import type { VocabWord } from "@/content/vocab";
import ExamRunner from "./exam-runner";

export default function ExamRemote({ level }: { level: string }) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/content/vocab")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<Record<string, Record<string, { words: VocabWord[] }>>>;
      })
      .then((data) => {
        if (cancelled) return;
        const words = Object.values(data[level] ?? {}).flatMap((l) => l.words);
        setExam(generateExam(words, level));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [level]);

  if (error) {
    return (
      <div className="mx-auto max-w-[760px] pt-10 text-center" role="alert">
        <p>Không tải được đề thi. Vui lòng thử lại sau.</p>
        <Link
          href="/certificate-test"
          className="inline-flex min-h-11 items-center justify-center rounded-control border border-transparent bg-action-primary px-5 font-semibold text-white hover:bg-action-primary-hover mt-4"
        >
          Về trang chứng chỉ
        </Link>
      </div>
    );
  }
  if (!exam) {
    return (
      <div aria-busy="true" className="mx-auto max-w-[880px] flex flex-col gap-4 pt-6">
        <div className="h-14 animate-pulse rounded-card bg-surface-muted" />
        <div className="h-72 animate-pulse rounded-card bg-surface-muted" />
      </div>
    );
  }
  return <ExamRunner exam={exam} />;
}
