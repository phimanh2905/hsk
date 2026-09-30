/* /course/[book] (B2) — trang khóa học: breadcrumb + badge + tiêu đề + pills skill
   + CourseProgress + danh sách bài + nút "Tổng ôn" → /review.
   Port từ clone/js/course.js renderBook + SPEC-01 §2. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { books } from "@/content/courses";
import CourseClient from "@/components/course/course-client";
import CourseProgress from "@/components/course/course-progress";

export function generateStaticParams() {
  return books.map((b) => ({ book: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ book: string }> }): Promise<Metadata> {
  const { book: slug } = await params;
  const book = books.find((b) => b.slug === slug);
  if (!book) return {};
  return {
    title: `${book.name} 3.0`,
    description: `Học ${book.cardMeta} theo giáo trình 标准教程 ${book.name} 3.0 — flashcard, trắc nghiệm, tổng ôn.`,
  };
}

export default async function CourseBookPage({ params }: { params: Promise<{ book: string }> }) {
  const { book: slug } = await params;
  const book = books.find((b) => b.slug === slug);
  if (!book) notFound();

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Link href="/" className="text-sm font-semibold text-nhai-muted hover:text-nhai-main">Trang chủ</Link>
        <span className="text-sm text-nhai-muted">/</span>
        <span className="pill pill-active text-xs">Nhai</span>
        <span className="font-bold">{book.name}</span>
        <span className="text-sm text-nhai-muted">· {book.lessons} bài</span>
      </div>

      <div className="mb-1">
        <h1 className="text-3xl font-extrabold tracking-tight">{book.name} 3.0</h1>
        <p className="zh text-nhai-muted">标准教程 {book.name} · 3.0</p>
      </div>

      <CourseProgress book={slug} />

      <CourseClient slug={slug} />

      <Link href="/review" className="btn-main inline-block px-6 py-3">Tổng ôn</Link>
    </div>
  );
}
