import { Suspense } from "react";
import RoadmapClient from "./roadmap-client";
import { roadmapLevels } from "@/content/roadmap-stations";

export const metadata = {
  title: "Lộ trình HSK",
  description:
    "Lộ trình serpentine theo cấp độ HSK — từng trạm bài học với từ vựng, ngữ pháp và mini test cuối chặng.",
};

/* Server component mỏng: useSearchParams của client island cần boundary Suspense
   (pattern steps-client của /roadmap/pinyin). */
export default function RoadmapPage() {
  return (
    <Suspense fallback={null}>
      <RoadmapClient levels={roadmapLevels} />
    </Suspense>
  );
}
