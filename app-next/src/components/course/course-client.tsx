"use client";

/* CourseClient (B2) — danh sách bài của một khóa học theo skill.
   Port từ clone/js/course.js:1-190 (lessonRowVocab/lessonRowLocked/renderBook)
   + SPEC-01 §2: 3 pill kỹ năng (active đỏ) đổi ?skill= bằng router.replace;
   hàng vocab = Link /lesson/[book]/[pageId] + "N từ vựng"; hàng grammar/hanzi
   = button + 🔒 mở Login modal; hàng đã hoàn thành có dấu ✓ (đọc listPageDone). */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { courses, genGrammar, genHanzi, type LessonMeta, type Skill } from "@/content/courses";
import { progressStore } from "@/lib/store/progress-store";
import { useLoginModal } from "@/components/shell/login-modal";
import { useSession } from "@/lib/use-session";
import { useTts } from "@/lib/tts/use-tts";

const SKILLS: { key: Skill; label: string }[] = [
  { key: "vocab", label: "Từ vựng · 词汇" },
  { key: "grammar", label: "Ngữ pháp · 语法" },
  { key: "hanzi", label: "Chữ Hán · 汉字" }
];

const PROGRESS_EVENT = "nhai:progress";

function LessonList({ slug, skill }: { slug: string; skill: Skill }) {
  const { openLogin } = useLoginModal();
  const { loggedIn } = useSession();
  const { speak } = useTts();
  const [mounted, setMounted] = useState(false);
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    const read = () => setDoneSet(new Set(progressStore.listPageDone(slug)));
    setMounted(true);
    read();
    window.addEventListener(PROGRESS_EVENT, read);
    return () => window.removeEventListener(PROGRESS_EVENT, read);
  }, [slug]);

  /* grammar/hanzi sinh theo clone/js/data/courses.js: genGrammar(5) / genHanzi(4) mỗi sách. */
  const items: LessonMeta[] =
    skill === "vocab"
      ? (courses[slug]?.pages ?? [])
      : skill === "grammar"
        ? genGrammar(5)
        : genHanzi(4);

  if (skill === "grammar") {
    /* SPEC-15 §3 + clone course.js grammarCard: card 2 cột — title (+🔒 khi chưa login)
       + 2 dòng placeholder + nút TTS vuông phải; click 🔊: chưa login → Login modal, đã login → speak. */
    return (
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {items.map((item) => (
          <div key={item.pageId} className="card shadow-neo p-4 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-sm mb-1.5 truncate">
                {item.title}
                {!loggedIn && <span aria-label="Cần đăng nhập"> 🔒</span>}
              </h3>
              <div className="h-3 rounded bg-nhai-soft mb-1.5 w-full" />
              <div className="h-3 rounded bg-nhai-soft w-2/3" />
            </div>
            <button
              type="button"
              data-tts
              className="grid-cell rounded-md w-9 h-9 shrink-0 text-base"
              aria-label="Đọc mẫu"
              title="Đọc mẫu"
              onClick={() => {
                if (!loggedIn) { openLogin(); return; }
                speak(item.title, { lang: "zh-CN" });
              }}
            >
              🔊
            </button>
          </div>
        ))}
      </div>
    );
  }

  if (skill === "hanzi") {
    return (
      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <button
            key={item.pageId}
            type="button"
            onClick={openLogin}
            className="card shadow-neo px-4 py-3 w-full flex items-center gap-3 text-left hover:-translate-y-0.5 transition-transform"
          >
            <span className="grid-cell rounded-md w-9 h-9 shrink-0 font-extrabold text-sm">{item.order}</span>
            <span className="font-semibold min-w-0 truncate">
              {item.title} <span aria-label="Cần đăng nhập">🔒</span>
            </span>
            <span className="ml-auto shrink-0 text-xs text-nhai-muted">{item.meta}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-6">
      {items.map((item) => (
        <Link
          key={item.pageId}
          href={`/lesson/${slug}/${item.pageId}`}
          className="card shadow-neo px-4 py-3 flex items-center gap-3 hover:-translate-y-0.5 transition-transform"
        >
          <span className="grid-cell rounded-md w-9 h-9 shrink-0 font-extrabold text-sm">{item.order}</span>
          <span className="font-semibold min-w-0 truncate">
            {item.title}
            {mounted && doneSet.has(item.pageId) ? " ✓" : ""}
          </span>
          <span className="ml-auto shrink-0 text-xs text-nhai-muted">{item.words} từ vựng</span>
        </Link>
      ))}
    </div>
  );
}

function CourseClientInner({ slug }: { slug: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("skill") ?? "vocab";
  const skill: Skill = SKILLS.some((s) => s.key === raw) ? (raw as Skill) : "vocab";

  return (
    <>
      <div className="flex flex-wrap gap-2 my-4" role="tablist" aria-label="Kỹ năng">
        {SKILLS.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={s.key === skill}
            onClick={() => router.replace(`/course/${slug}?skill=${s.key}`, { scroll: false })}
            className={"pill" + (s.key === skill ? " pill-active" : "")}
          >
            {s.label}
          </button>
        ))}
      </div>
      <LessonList slug={slug} skill={skill} />
    </>
  );
}

export default function CourseClient({ slug }: { slug: string }) {
  return (
    <Suspense fallback={null}>
      <CourseClientInner slug={slug} />
    </Suspense>
  );
}
