# Shadowing Library: Card Navigate + YouTube Thumbnail — Design

**Date:** 2026-10-28
**Branch:** react-player-migration
**Status:** Approved (Phương án A)

## Vấn đề

Trên `/shadowing` (library):

1. Card video chỉ render gradient CSS placeholder (`.hz-thumb-gradient`), không bao giờ render thumbnail YouTube.
2. Click card chỉ mở `ShadowingDrawer` (panel phải 400px preview script) — user không hiểu panel này là gì và không thấy nó là lối vào studio.
3. Route studio `/shadowing/{id}` hoạt động tốt (e2e dictation goto thẳng URL PASS) nhưng không có đường vào trực tiếp: phải mở drawer rồi tìm nút CTA cuối drawer.

## Quyết định (Phương án A — đã owner chốt)

1. **Thumbnail thật:** card render `<img src="https://i.ytimg.com/vi/{id}/hqdefault.jpg">`; khi load lỗi (`onError`) thì giữ gradient + 2 chữ đầu title làm fallback. Tất cả 20 video hiện tại đều `type: "youtube"`; với `type: "audio"` (tương lai) giữ nguyên fallback.
   - Dùng plain `<img>` (không `next/image`, không cần `remotePatterns` — chỉ 1 domain i.ytimg.com, ảnh nhỏ, lazy load).
   - `loading="lazy"`, `alt=""` (title đã hiển thị bên dưới card).
   - Hero daily-pick cũng dùng thumbnail thật, cùng fallback.
2. **Card click → navigate thẳng tới studio** `/shadowing/{id}` (dùng `next/link` thay `button` để giữ semantics + mở tab giữa bằng chuột). Không còn mở drawer khi click card.
3. **Drawer preview giữ lại, lối vào mới:** mỗi card có nút icon riêng (icon file-text "Xem kịch bản") đè góc trên phải thumbnail, `stopPropagation`, mở `ShadowingDrawer` như cũ. Drawer giữ nguyên hành vi (preview script + TTS từng câu + CTA "Mở bài luyện đầy đủ").

## File ảnh hưởng

- Modify: `app-next/src/app/(app)/shadowing/shadowing-library.tsx` — card thành `Link`, thêm thumbnail component + nút preview, hero daily-pick thumbnail.
- Create: `app-next/src/app/(app)/shadowing/video-thumbnail.tsx` — component dùng chung grid + hero, chứa logic onError fallback.
- Modify: `app-next/src/app/(app)/shadowing/shadowing-drawer.tsx` — không đổi logic; (optional) thêm thumbnail nhỏ ở header drawer. → YAGNI: không đổi.

## Testing

- Unit (vitest): `video-thumbnail` render img đúng URL cho `type:"youtube"`, fallback gradient khi error, fallback cho `type:"audio"`.
- Unit: card grid render `Link` href `/shadowing/{id}`; nút preview vẫn gọi `setDrawerVideo`.
- QA control-browser: thumbnail hiển thị ảnh thật; click card navigate tới `/shadowing/EA3rwvr99Q0`; click nút kịch bản mở drawer.

## Global constraints

- pnpm là package manager bắt buộc; unit chạy `pnpm vitest run`, e2e/QA ở port 3100.
- Tuân thủ design system Hanzi (DESIGN.md): dùng token class sẵn có, icon qua `ui/icon.tsx` (lucide), không thêm CSS mới nếu không cần.
