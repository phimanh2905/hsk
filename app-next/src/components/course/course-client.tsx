"use client";

/* CourseClient (B2) — danh sách bài của một khóa học theo skill.
   Port từ clone/js/course.js:1-190 (lessonRowVocab/lessonRowLocked/renderBook)
   + SPEC-01 §2: 3 pill kỹ năng (active) đổi ?skill= bằng router.replace;
   hàng vocab = Link /lesson/[book]/[pageId] + "N từ vựng"; hàng grammar/hanzi
   = button + mở Login modal; hàng đã hoàn thành có dấu ✓ (đọc listPageDone). */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { courses, genGrammar, genHanzi, type LessonMeta, type Skill } from "@/content/courses";
import { progressStore } from "@/lib/store/progress-store";
import { useLoginModal } from "@/components/shell/login-modal";
import { useSession } from "@/lib/use-session";
import { useTts } from "@/lib/tts/use-tts";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { Lock, Volume2, CircleCheck, ICON_STROKE } from "@/components/ui/icon";

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
    /* SPEC-15 §3 + clone course.js grammarCard: card 2 cột — title (+ khóa khi chưa login)
       + 2 dòng placeholder + nút TTS vuông phải; click TTS: chưa login → Login modal, đã login → speak. */
    return (
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {items.map((item) => (
          <Card key={item.pageId} className="p-4 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-sm mb-1.5 truncate">
                {item.title}
                {!loggedIn && (
                  <span aria-label="Cần đăng nhập" className="inline-flex align-middle ml-1">
                    <Lock size={14} strokeWidth={ICON_STROKE} className="text-text-secondary" aria-hidden="true" />
                  </span>
                )}
              </h3>
              <div className="h-3 rounded bg-surface-paper border border-border-subtle mb-1.5 w-full" />
              <div className="h-3 rounded bg-surface-paper border border-border-subtle w-2/3" />
            </div>
            <IconButton
              label="Đọc mẫu"
              variant="solid"
              className="w-9 h-9 min-h-9 min-w-9 shrink-0"
              onClick={() => {
                if (!loggedIn) { openLogin(); return; }
                speak(item.title, { lang: "zh-CN" });
              }}
            >
              <Volume2 size={18} strokeWidth={ICON_STROKE} />
            </IconButton>
          </Card>
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
            className="block w-full text-left hover:-translate-y-0.5 transition-transform"
          >
            <Card className="px-4 py-3 flex items-center gap-3">
              <span className="inline-flex items-center justify-center rounded-control border border-border-default bg-surface-paper w-9 h-9 shrink-0 font-extrabold text-sm">
                {item.order}
              </span>
              <span className="font-semibold min-w-0 truncate">
                {item.title}
                <span aria-label="Cần đăng nhập" className="inline-flex align-middle ml-1">
                  <Lock size={14} strokeWidth={ICON_STROKE} className="text-text-secondary" aria-hidden="true" />
                </span>
              </span>
              <span className="ml-auto shrink-0 text-xs text-text-secondary">{item.meta}</span>
            </Card>
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
          className="block hover:-translate-y-0.5 transition-transform"
        >
          <Card className="px-4 py-3 flex items-center gap-3">
            <span className="inline-flex items-center justify-center rounded-control border border-border-default bg-surface-paper w-9 h-9 shrink-0 font-extrabold text-sm">
              {item.order}
            </span>
            <span className="font-semibold min-w-0 truncate inline-flex items-center gap-1">
              {item.title}
              {mounted && doneSet.has(item.pageId) && (
                <CircleCheck size={16} strokeWidth={ICON_STROKE} className="text-feedback-success shrink-0" aria-label="Đã hoàn thành" />
              )}
            </span>
            <span className="ml-auto shrink-0 text-xs text-text-secondary">{item.words} từ vựng</span>
          </Card>
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
          <Chip
            key={s.key}
            role="tab"
            aria-selected={s.key === skill}
            selected={s.key === skill}
            onClick={() => router.replace(`/course/${slug}?skill=${s.key}`, { scroll: false })}
          >
            {s.label}
          </Chip>
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
