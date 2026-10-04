# Roadmap Serpentine Redesign — Design Spec

- **Ngày:** 2026-10-04
- **Nguồn mock:** `opendesign_hsk/roadmap.html` (chưa port dòng nào)
- **App đích:** `app-next/` (Next.js 16 App Router, React 19, Tailwind v4, TS strict)
- **Nhánh:** phát triển trên nhánh mới dựa trên `home-dashboard-redesign` (phụ thuộc tokens + primitives đã port từ home redesign: SegmentedTabs, Progress, Chip, IconTile, StreakPill…)
- **Trạng thái:** Đã duyệt qua brainstorming (4 câu hỏi phạm vi + phương án A + thiết kế chi tiết)

## 1. Mục tiêu

Thay thế trang `/roadmap` hiện tại bằng UI serpentine của mock, chuyển 100% thiết kế thành components tuân thủ design system của `app-next`. Bao gồm:

- Topbar riêng của trang: back-link về Home, level switcher HSK 1/2/3/4–6, head-progress (số % + bar 90px jade).
- Milestone banner: kicker, tiêu đề chặng, dòng tổng hợp tiến độ, progress bar jade, meta 2 đầu ("Trạm hiện tại" / "Còn X bài").
- Serpentine path: spine nét đứt giữa, node tròn 56px xen kẽ trái/phải với station card, 4 trạng thái node (done / active / locked / milestone diamond 45°), responsive <760px về 1 cột 56px.
- Right drawer 420px: status badge, tiêu đề, 2 tabs (Từ vựng mới / Ngữ pháp trọng tâm), vocab rows có nút audio, 3 nút launch (Học Flashcard / Luyện viết Hanzi / Quiz).

## 2. Quyết định phạm vi (đã duyệt)

| Quyết định | Lựa chọn |
|---|---|
| Trang | Thay thế `/roadmap` cũ (vertical timeline 6 chặng). Các trang `/roadmap/pinyin*` giữ nguyên. |
| Dữ liệu trạm | Content module tĩnh mới (zod schema), seed theo mock. |
| Level switcher | Wire thật theo content — mỗi level có bộ banner + stations riêng; level chưa có dữ liệu hiện "sắp ra mắt". `?level=` trên URL để share/refresh. |
| Tiến độ | Derive từ `progressStore` (localStorage, pattern mount-gate SSR-safe) + content. Không hardcode trạng thái mock. |

## 3. Non-goals (phase 1)

- 3 nút launch trong drawer và CTA "Vào bài học" **chưa** nối route bài học thật (chưa có content bài học per-trạm) — hành vi mock: hiện toast "sắp ra mắt". Phase sau nối `/lesson/*` khi content sẵn sàng.
- Không đổi app shell toàn cục; theme toggle nằm ở shell, topbar của roadmap không nhân bản.
- Không động vào `/roadmap/pinyin`, `/pinyin/practice`, session routes.

## 4. Data model — `src/content/roadmap-stations.ts`

Zod schema + data tĩnh, tách dữ liệu tĩnh khỏi trạng thái tiến độ:

```ts
type StationKind = "lesson" | "milestone";

interface Station {
  id: string;              // "1"…"6", "m" cho milestone
  no: string;              // "Trạm 1", "Milestone"
  title: string;
  zh: string;              // hanzi minh họa
  meta: string;            // mô tả ngắn (điển hình là dòng khóa/upcoming)
  kind: StationKind;
  vocab: [zh: string, pinyin: string, vi: string][];
  gram: [name: string, desc: string][];
}

interface RoadmapLevel {
  id: "hsk-1" | "hsk-2" | "hsk-3" | "hsk-4-6";
  label: string;           // "HSK 1", "HSK 4–6"
  kicker: string;          // "CHẶNG 1 · NỀN TẢNG GIAO TIẾP"
  title: string;
  status: "available" | "upcoming";
  stations: Station[];
}
```

- `side` (trái/phải) **không lưu** — suy ra từ index (`index % 2 === 0 → left`), đúng thứ tự xen kẽ của mock, tránh lệch dữ liệu.
- `done/active/locked`, `%`, sao **không nằm trong content** — derive từ progress (mục 5).
- Seed data: level `hsk-2` = `available` với 7 trạm của mock (Trạm 1–5, Milestone, Trạm 6) kèm vocab + grammar như mock. Level `hsk-1` = `available` nhưng `stations: []` — UI chỉ render banner, sub dẫn về `/roadmap/pinyin` (nền tảng Pinyin đã có). `hsk-3`, `hsk-4-6` = `upcoming` ("sắp ra mắt").
- Schema validate ở module load (pattern hiện có của `src/content/*`).

## 5. Progress — `src/lib/roadmap-progress.ts`

- Key store mới: `nhai.roadmap.stations.v1` — `Record<levelId, Record<stationId, { pct: number; stars: 0|1|2|3 }>>`, đọc/ghi qua pattern `readJSON`/`writeJSON` của `progress-store.ts` (thêm method `getStationProgress` / `setStationProgress` vào `ProgressStoreApi`).
- Hàm thuần `deriveStationStates(level, record) → StationView[]`, `StationView = { station, state: "done"|"active"|"locked", pct, stars }`:
  - `done`: có record, pct ≥ 100 (hoặc đủ stars).
  - `active`: trạm `kind: "lesson"` đầu tiên tính từ trái chưa `done`; các trạm sau nó (kể cả milestone) → `locked`.
  - Milestone chỉ `active`/`done` khi tất cả trạm lesson trước đã done.
  - Milestone khi done/coi như mốc: giữ hành vi mock — hiển thị diamond; chưa mở thì node diamond + lock note.
- Banner: `%` = (tổng pct các trạm lesson) / (tổng số trạm lesson), làm tròn số nguyên; milestone không tính vào mẫu số. "Trạm hiện tại" = trạm active; "Còn X bài tới mốc" = số trạm lesson chưa done trước milestone.
- Hook `useRoadmapProgress(levelId)`: mount-gate, default 0/rỗng trước mount, `try/catch` quanh localStorage — SSR-safe như pattern hiện có.
- Với store rỗng: Trạm 1 active, còn lại locked, banner 0% — trung thực, không fake data demo của mock.

## 6. Kiến trúc component (Phương án A)

```
src/app/(app)/roadmap/page.tsx             # server component: metadata + render <RoadmapClient levels={roadmapLevels}/>
src/app/(app)/roadmap/roadmap-client.tsx   # "use client": state levelActive (?level=), state drawerStation, useRoadmapProgress
src/components/roadmap/
  roadmap-topbar.tsx        # sticky topbar: back-link + LevelSwitcher + head-progress; KHÔNG có theme toggle (shell đã có)
  level-switcher.tsx        # tái dụng ui/segmented-tabs; đổi ?level= qua router.replace(scroll:false)
  milestone-banner.tsx      # kicker + h1 + sub + Progress jade + meta 2 đầu
  serpentine-path.tsx       # .path-wrap: spine absolute + grid [1fr 72px 1fr] / <760px: [56px 1fr]
  station-node.tsx          # node tròn 56px 4 state + pulse animation
  station-card.tsx          # 4 biến thể: done (3 sao) / active (float-badge + mini-bar + CTA full-width) / locked (lock-note) / milestone (diamond 45° + gem)
  station-drawer.tsx        # panel phải 420px (không tái dụng ui/dialog — Dialog là overlay giữa màn hình)
```

- `roadmap-client.tsx` giữ state tối thiểu: level active + trạm đang mở drawer; mọi view khác derive.
- `?level=` sync URL để refresh/share giữ nguyên level (pattern `useSearchParams` như `steps-client.tsx`).

## 7. Token & visual fidelity (100%)

- Chỉ dùng semantic tokens: `bg-surface-paper/-elevated/-muted`, `text-text-primary/-secondary`, `border-border-default`, `bg-action-primary/-hover`, `bg-amber-wash`, `text-amber-ink`, `bg-ring-track`, `rounded-card` (16px), `rounded-control` (8px), `shadow-xs/-md`.
- **Thêm 1 mapping semantic:** `--color-jade: var(--hz-jade)` trong block `@theme inline` của `globals.css` (primitive `--hz-jade` light `#2d7d5b` / dark `#4caf8a` đã tồn tại) — dùng cho progress fill, node done, mini-bar.
- Breakpoint 760px của mock → variant `min-[760px]:`; 640px của topbar → `max-[640px]:`.
- Pulse animation: `@keyframes` trong `globals.css`, đúng thông số mock (2.2s ease-in-out infinite, halo `color-mix` 16%→7%), kèm `@media (prefers-reduced-motion: reduce)` tắt animation.
- Milestone diamond: rotate(45°) 48px, gem 44px rotate(-45°) bên trong — port nguyên.
- Icon: chỉ qua `@/components/ui/icon` với `ICON_STROKE` (check, lock, play, trophy, star, volume, arrow-left, x, monitor-play, pen-line, help-circle…).
- Nút CTA full-width `min-h-11` (44px touch target); launch buttons `min-h-12` (48px như mock).
- Hanzi font qua class `.zh` hiện có.

## 8. Tương tác & a11y

- **Drawer:** `role="dialog"` `aria-modal`, đóng bằng nút X / click overlay / Escape; focus trap + trả focus về node kích hoạt; transition translateX như mock (0.28s cubic-bezier(.2,.7,.2,1)).
- **Tabs drawer:** tái dụng `SegmentedTabs` (visual trùng khớp mock; a11y theo `aria-pressed` của primitive thay vì `role=tab` — deviation nhỏ chấp nhận cho nhất quán design system).
- **Audio:** vocab row gọi `useTts` thật để phát âm hanzi (thay toast demo của mock).
- **Toast:** chuyển level, trạm khóa, launch "sắp ra mắt" → dùng `useToast` của shell.
- Node/card mở drawer cả khi locked (xem trước), kèm toast "Trạm đang khóa — xong Bài X để mở" như mock.
- Grid/focus order: node và card đều focusable, `aria-label` đầy đủ theo mock ("Trạm 4: Sở thích — đang học").

## 9. Dọn dẹp kèm theo

- Xóa `src/components/roadmap/journey-card.tsx` + `timeline-client.tsx` (chỉ trang `/roadmap` cũ dùng — kiểm tra không còn import trước khi xóa).
- Giữ nguyên: `steps-client.tsx`, `session-client.tsx`, `/roadmap/pinyin`, session routes, `src/content/roadmap.ts` (nếu `roadmapStages` còn dùng nơi khác — kiểm tra; nếu chỉ trang cũ dùng thì xóa luôn).
- Route `/roadmap` giữ path, thay nội dung; `metadata` cập nhật đúng.

## 10. Testing

- Component test colocated `__tests__/*.test.tsx` cho từng component: render đúng theo state (done/active/locked/milestone), drawer mở/đóng/tab switch, banner derive %.
- `src/lib/roadmap-progress/__tests__/roadmap-progress.test.ts`: bảng derive (rỗng, giữa chừng, hết chặng, milestone khóa/mở) + parse store key lỗi.
- Content schema test: mock data validate qua zod schema.
- `vitest` + `tsc --noEmit` sạch; so khớp visual thủ công với mock ở cả light/dark, ≥760px và <760px.

## 11. Tiêu chí nghiệm thu

1. `/roadmap` render UI trùng khớp mock 100% (layout, spacing, màu, animation, responsive) ở cả light/dark.
2. Switch level đổi banner + path theo content; `?level=` giữ nguyên sau refresh.
3. Trạng thái trạm derive đúng từ progressStore (store rỗng → Trạm 1 active).
4. Drawer hoạt động đủ: tabs, audio TTS thật, Escape/overlay close, focus management.
5. Không còn tham chiếu đến UI roadmap cũ đã xóa; `/roadmap/pinyin` không bị ảnh hưởng.
6. Toàn bộ test + typecheck xanh.
