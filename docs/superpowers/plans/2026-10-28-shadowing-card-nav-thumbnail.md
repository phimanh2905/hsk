# Shadowing Card Navigate + YouTube Thumbnail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trên `/shadowing`, card video có thumbnail YouTube thật, click card navigate thẳng tới studio `/shadowing/{id}`, drawer preview script mở qua nút icon riêng trên card.

**Architecture:** Thêm `VideoThumbnail` component (img i.ytimg.com + onError fallback gradient) dùng chung cho grid card và hero daily-pick. Đổi card từ `<button onClick={setDrawerVideo}>` thành `<Link href="/shadowing/{id}">` với nút icon file-text (stopPropagation) để mở `ShadowingDrawer` như cũ. Không đổi drawer, không đổi route studio.

**Tech Stack:** Next.js App Router, React 19, vitest + @testing-library/react, Tailwind token class của design system Hanzi.

**Spec:** `docs/superpowers/specs/2026-10-28-shadowing-card-nav-thumbnail-design.md`

## Global Constraints

- Package manager: `pnpm` (BẮT BUỘC, npm phá node_modules). Unit: `pnpm vitest run` trong `app-next/`.
- Icon phải qua `@/components/ui/icon` (lucide re-export) — không import lucide trực tiếp.
- Plain `<img>` với `loading="lazy"`, `alt=""`; KHÔNG dùng next/image, KHÔNG sửa next.config.
- `type: "audio"` (không phải youtube) → render fallback gradient ngay từ đầu, không render img.
- Branch làm việc: `react-player-migration` (đang checkout, có working tree đã sửa `sidebar-nav.tsx` — KHÔNG commit file đó).

---

### Task 1: VideoThumbnail component (img + onError fallback)

**Files:**
- Create: `app-next/src/app/(app)/shadowing/video-thumbnail.tsx`
- Test: `app-next/src/app/(app)/shadowing/__tests__/video-thumbnail.test.tsx`

**Interfaces:**
- Consumes: `ShadowingVideo` từ `@/content/shadowing` (fields `id: string`, `title: string`, `type: "youtube" | "audio"`).
- Produces: `export function VideoThumbnail({ video, big }: { video: ShadowingVideo; big?: boolean }): JSX.Element` — Task 2 dùng với `big` cho hero (chữ placeholder 8xl thay vì 5xl), Task 2 dùng mặc định cho grid.

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/app/(app)/shadowing/__tests__/video-thumbnail.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VideoThumbnail } from "../video-thumbnail";
import type { ShadowingVideo } from "@/content/shadowing";

const ytVideo = {
  id: "EA3rwvr99Q0",
  title: "视频标题",
  type: "youtube",
} as ShadowingVideo;

const audioVideo = { ...ytVideo, id: "demo-audio", type: "audio" } as ShadowingVideo;

describe("VideoThumbnail", () => {
  it("youtube: render img i.ytimg.com hqdefault, lazy, alt rỗng", () => {
    render(<VideoThumbnail video={ytVideo} />);
    const img = screen.getByRole("img", { hidden: true });
    expect(img).toHaveAttribute("src", "https://i.ytimg.com/vi/EA3rwvr99Q0/hqdefault.jpg");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("alt", "");
  });

  it("audio: không render img, giữ fallback gradient + 2 chữ đầu title", () => {
    const { container } = render(<VideoThumbnail video={audioVideo} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".hz-thumb-gradient")).not.toBeNull();
    expect(container.textContent).toContain("视频");
  });

  it("youtube: img onError → ẩn img, fallback hiện", () => {
    const { container } = render(<VideoThumbnail video={ytVideo} />);
    const img = container.querySelector("img")!;
    fireEvent.error(img);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".hz-thumb-gradient")).not.toBeNull();
  });

  it("big: chữ placeholder là text-8xl, mặc định text-5xl", () => {
    const { container, rerender } = render(<VideoThumbnail video={audioVideo} />);
    expect(container.querySelector(".text-5xl")).not.toBeNull();
    rerender(<VideoThumbnail video={audioVideo} big />);
    expect(container.querySelector(".text-8xl")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (trong `app-next/`): `pnpm vitest run src/app/\(app\)/shadowing/__tests__/video-thumbnail.test.tsx`
Expected: FAIL — không tìm thấy module `../video-thumbnail`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// app-next/src/app/(app)/shadowing/video-thumbnail.tsx
"use client";
/* Thumbnail YouTube cho card grid + hero daily-pick. onError → fallback gradient
   (placeholder 2 chữ đầu title) — fallback cũng dùng cho type "audio". */
import { useState } from "react";
import type { ShadowingVideo } from "@/content/shadowing";

export function VideoThumbnail({ video, big = false }: { video: ShadowingVideo; big?: boolean }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = video.type === "youtube" && !imgFailed;

  return (
    <>
      {showImg && (
        <img
          src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {!showImg && (
        <span
          className={`hanzi absolute inset-0 flex items-center justify-center ${
            big ? "text-8xl" : "text-5xl"
          } text-white/20 select-none pointer-events-none hz-thumb-gradient`}
        >
          {video.title.slice(0, 2)}
        </span>
      )}
    </>
  );
}
```

Lưu ý cho implementer: placeholder span mang luôn class `hz-thumb-gradient` (gradient đổ vào span thay vì div cha) để fallback "đầy" toàn khung; các wrapper ở Task 2 sẽ là div `relative aspect-video overflow-hidden` KHÔNG có `hz-thumb-gradient` nữa (tránh gradient lộ dưới ảnh trong lúc img đang load — nền img trắng tự nhiên). Duration badge do nơi gọi render, không thuộc component này.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/\(app\)/shadowing/__tests__/video-thumbnail.test.tsx`
Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/app/\(app\)/shadowing/video-thumbnail.tsx app-next/src/app/\(app\)/shadowing/__tests__/video-thumbnail.test.tsx
git commit -m "feat(shadowing): VideoThumbnail — img i.ytimg.com + onError fallback gradient"
```

---

### Task 2: Card grid → Link navigate + nút preview drawer; hero dùng VideoThumbnail

**Files:**
- Modify: `app-next/src/app/(app)/shadowing/shadowing-library.tsx` (grid card: dòng ~218-259; hero: dòng ~128-146)

**Interfaces:**
- Consumes: `VideoThumbnail({ video, big? })` từ Task 1; `ShadowingDrawer` (giữ nguyên, đã có sẵn); icon `FileText` từ `@/components/ui/icon` (lucide re-export — kiểm tra export có sẵn; nếu chưa có thì thêm `export { FileText } from "lucide-react"` theo pattern hiện có của file).

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/app/(app)/shadowing/__tests__/shadowing-library.test.tsx`. Library phụ thuộc `useShadowingProgress` (fetch), `useTts`, `useToast` — mock cả 3 ở đầu file (pattern: xem test khác trong repo, vd `src/components/shadowing/studio/__tests__/` dùng `vi.mock`):

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/shadowing/use-shadowing-progress", () => ({
  useShadowingProgress: () => ({
    metrics: { practiced: 0, seconds: 0, avgScore: null },
    progressMap: {},
  }),
}));
vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => ({ speak: vi.fn() }) }));
vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => vi.fn(),
}));

import ShadowingLibrary from "../shadowing-library";
import { VIDEOS, SUBTITLES } from "../test-fixtures";

describe("ShadowingLibrary grid card", () => {
  it("card là Link tới /shadowing/{id}", () => {
    render(<ShadowingLibrary videos={VIDEOS} subtitlesByVideo={SUBTITLES} />);
    const card = screen.getByTestId("video-EA3rwvr99Q0");
    expect(card.tagName).toBe("A");
    expect(card).toHaveAttribute("href", "/shadowing/EA3rwvr99Q0");
  });

  it("card có thumbnail img youtube", () => {
    render(<ShadowingLibrary videos={VIDEOS} subtitlesByVideo={SUBTITLES} />);
    const card = screen.getByTestId("video-EA3rwvr99Q0");
    expect(card.querySelector("img")).not.toBeNull();
  });

  it("nút 'Xem kịch bản' mở drawer, KHÔNG navigate", () => {
    render(<ShadowingLibrary videos={VIDEOS} subtitlesByVideo={SUBTITLES} />);
    const card = screen.getByTestId("video-EA3rwvr99Q0");
    fireEvent.click(screen.getByRole("button", { name: "Xem kịch bản" }));
    expect(screen.getByRole("dialog", { name: "Xem trước hội thoại" })).toBeDefined();
  });
});
```

Tạo fixture `app-next/src/app/(app)/shadowing/__tests__/test-fixtures.ts` (import thật từ content để không lệch type):

```ts
import { VIDEOS as ALL, SUBTITLE_SENTENCES } from "@/content/shadowing";
import type { SubtitleSentence } from "@/content/shadowing";

export const VIDEOS = ALL.slice(0, 3);
export const SUBTITLES: Record<string, SubtitleSentence[]> = Object.fromEntries(
  VIDEOS.map((v) => [v.id, SUBTITLE_SENTENCES[v.id] ?? []]),
);
```

Lưu ý: kiểm tra tên export phụ đề thật trong `src/content/shadowing.ts` (Explore ghi nhận hằng số chứa câu phụ đề — nếu tên khác, vd `SUBTITLES` hoặc map riêng, dùng đúng tên thật; component `shadowing-library` nhận `subtitlesByVideo` prop nên fixture chỉ cần map id → mảng, có thể tự dựng `[]` nếu content không export — `syntheticLines` sẽ lo phần render).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/\(app\)/shadowing/__tests__/shadowing-library.test.tsx`
Expected: FAIL — `video-EA3rwvr99Q0` là `BUTTON`, không phải `A`.

- [ ] **Step 3: Implement**

Sửa `shadowing-library.tsx`:

a) Imports: thêm `import Link from "next/link"`, `import { VideoThumbnail } from "./video-thumbnail"`, đổi import icon thành `import { Play, FileText } from "@/components/ui/icon";`

b) Grid card — thay `<button ... onClick={() => setDrawerVideo(v)}>` bằng `<Link ...>` (giữ toàn bộ className + data-od-id), và thay khối thumbnail bằng `VideoThumbnail` + nút preview:

```tsx
<Link
  key={v.id}
  href={"/shadowing/" + v.id}
  data-od-id={"video-" + v.id}
  data-testid={"video-" + v.id}
  className="group text-left rounded-card border border-border-default bg-surface-elevated shadow-xs overflow-hidden transition hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
>
  <div className="relative aspect-video overflow-hidden">
    <VideoThumbnail video={v} />
    <span className="absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[11px] font-bold text-white">
      {v.duration}
    </span>
    <button
      type="button"
      aria-label="Xem kịch bản"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDrawerVideo(v);
      }}
      className="absolute top-2 right-2 rounded-full bg-black/45 px-2.5 py-1.5 text-[11px] font-bold text-white inline-flex items-center gap-1.5 hover:bg-black/65 transition focus-visible:outline-none focus-visible:ring-3 ring-action-focus"
    >
      <FileText className="size-3.5" />
      Kịch bản
    </button>
  </div>
  {/* ...phần p-4 bên dưới GIỮ NGUYÊN... */}
</Link>
```

c) Hero daily-pick — giữ div cha `hz-thumb-gradient aspect-video rounded-[14px] relative overflow-hidden cursor-pointer group` và onClick `previewFirst(daily)` (hành vi nghe mẫu giữ nguyên), NHƯNG thay span placeholder chữ bằng `VideoThumbnail video={daily} big` khi daily là youtube; vì hero cần gradient nền cho fallback, đặt `VideoThumbnail` lên trên và cho span placeholder giữ class riêng: đơn giản nhất — thay toàn bộ span đầu (dòng 132-134) thành `{<VideoThumbnail video={daily} big />}` và thêm class `hz-thumb-gradient` VÀO span placeholder đã mang sẵn trong component (đã có). Div cha bỏ class `hz-thumb-gradient`, chuyển thành `relative aspect-video rounded-[14px] overflow-hidden cursor-pointer group`. Các badge (play button, duration, tốc độ) giữ nguyên vị trí.

d) Xóa comment SLOT-DRAWER cũ ở dòng 58-59 và comment tại chỗ `setDrawerVideo` cũ — cập nhật thành: `{/* Drawer mở qua nút "Kịch bản" trên card; card click navigate studio */}`.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/app/\(app\)/shadowing/__tests__/`
Expected: PASS (cả test Task 1 lẫn Task 2). Sau đó chạy full unit: `pnpm vitest run` — expected toàn bộ xanh (~1399 test).

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint` (trong `app-next/`; nếu script tên khác, xem `package.json`).
Expected: 0 lỗi mới.

- [ ] **Step 6: Commit**

```bash
git add app-next/src/app/\(app\)/shadowing/shadowing-library.tsx app-next/src/app/\(app\)/shadowing/__tests__/shadowing-library.test.tsx app-next/src/app/\(app\)/shadowing/__tests__/test-fixtures.ts app-next/src/components/ui/icon.tsx
git commit -m "feat(shadowing): card navigate studio + thumbnail YouTube + nút kịch bản mở drawer"
```

---

### Task 3: QA control-browser 3 case + verify

**Files:**
- Không sửa code (chỉ verify). Nếu bắt bug → fix trong Task 2 files và commit riêng `fix(shadowing): ...`.

**Interfaces:**
- Consumes: dev server đang chạy ở `http://localhost:3100` (nếu chưa chạy: `pnpm dev` trong `app-next/`, port 3100 là port e2e; đăng nhập qua dev-login QA route theo runbook đã có).

- [ ] **Step 1: QA case 1 — thumbnail thật hiển thị**

Dùng skill `browser-use:control-browser`: vào `/shadowing`, assert ít nhất 1 `<img>` trong `[data-testid="video-grid"]` có `src` chứa `i.ytimg.com` và ảnh load thành công (`naturalWidth > 0`).

- [ ] **Step 2: QA case 2 — click card navigate**

Click card `video-EA3rwvr99Q0` → URL phải là `/shadowing/EA3rwvr99Q0`, page hiển thị studio (`data-testid` mode-shadow hoặc player visible). Bấm Back → về `/shadowing`.

- [ ] **Step 3: QA case 3 — nút Kịch bản mở drawer**

Về `/shadowing`, click nút "Kịch bản" trên card `video-EA3rwvr99Q0` → drawer `[data-od-id="script-drawer"]` hiện, có nút "Mở bài luyện đầy đủ" → click → vào `/shadowing/EA3rwvr99Q0`.

- [ ] **Step 4: Commit kết quả QA / fix**

Nếu có fix: commit từng fix. Ghi kết quả 3/3 PASS vào message commit cuối hoặc báo cáo trong chat.

---

## Self-review đã chạy

- Spec coverage: thumbnail (T1+T2), card navigate (T2), nút preview drawer (T2), hero nhất quán (T2c), QA (T3). ✅
- Không placeholder: mọi step có code/lệnh cụ thể. ✅
- Type consistency: `VideoThumbnail({ video, big })` dùng nhất quán T1↔T2. ✅
