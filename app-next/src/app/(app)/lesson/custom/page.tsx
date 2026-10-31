import type { Metadata } from "next";
import { Suspense } from "react";
import CustomLessonClient from "./custom-lesson-client";

/* Route /lesson/custom — SSG tĩnh; deckId đọc từ query ?deck= trong
   CustomLessonClient (useSearchParams). Deep-link /lesson/custom/<deckId> cũ
   được _redirects (Cloudflare) chuyển 302 sang dạng query mới. */
export const metadata: Metadata = { title: "Bài học" };

export default function CustomLessonPage() {
  return (
    <Suspense fallback={null}>
      <CustomLessonClient />
    </Suspense>
  );
}
