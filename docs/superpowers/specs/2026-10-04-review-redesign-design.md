# Review Redesign — port `opendesign_hsk/review.html` vào `app-next`

- **Ngày:** 2026-10-04
- **Trạng thái:** Đã duyệt design (brainstorming) — chờ review spec
- **Nguồn design:** `opendesign_hsk/review.html` (583 dòng, mock "Hanzi — Ôn tập ngắt quãng (SRS)", CSS thuần tự chứa)
- **Phạm vi repo:** `app-next/` — nhánh `home-dashboard-redesign` (đã có token vermilion + primitives từ home redesign, spec `2026-10-04-home-dashboard-redesign-design.md`)

## 1. Mục tiêu & quyết định đã chốt

Port **100%** mock Review/SRS thành component, thay trang `/review` hiện tại. Quyết định người dùng đã chọn:

1. **Phạm vi dữ liệu: UI + dữ liệu thật** — wire `progressStore`/`SrsItem` thật, ghi grade thật với 3 khoảng nghỉ đúng label nút (1 phút / 5 phút / từ tiếp theo). Không thuật toán Leitner đầy đủ (interval cố định theo bucket).
2. **Kiến trúc: phương án A — feature-folder** — tách component trong `src/components/review/`, tái dùng primitives + `useStrokePlayer` + TTS + `ToastProvider`, thêm `lib/srs-session.ts` thuần function.

Ngoài phạm vi (mock có nhưng **không port**):

- **Topbar của mock** (back + filter HSK + theme toggle): app đã có shell riêng (Topbar/SidebarNav/BottomNav theo spec home redesign). Filter HSK đưa vào trong content trang. Theme toggle bỏ — `ThemeProvider` của app lo việc đó. Back-link "Trang chủ" không cần (sidebar/nav đã có).
- **18 từ mock data** (`WORDS` array cứng) — chỉ là placeholder; component đọc SRS thật.
- **Toast tự viết trong mock** — dùng `ToastProvider` hiện có.

Điều kiện tiên quyết: primitives + token từ home redesign (Card/Chip/SegmentedTabs/Button lg/Progress) đã nằm trên nhánh này — đúng thực tế git (các commit `c812c8a`…`4f3f7a3`).

## 2. Mô hình dữ liệu & logic SRS

### 2.1 Loại grade và mapping

| Nút mock | Grade | Ghi vào `SrsItem` |
|---|---|---|
| Quên · Sau 1 phút | `"forgot"` | `status = "learning"`, `dueAt = now + 60_000` |
| Khó · Sau 5 phút | `"hard"` | `status = "learning"`, `dueAt = now + 300_000` |
| Nhớ · Từ tiếp theo | `"good"` | `learning` → `dueAt = now + 3 ngày`; `learned`/`known` → `dueAt = now + 7 ngày` (đúng copy bucket "Ôn định kỳ 3 ngày một lần" / "sau 7 ngày") |

Mọi grade: `reviewCount++`, `lastReviewedAt = now`, `updatedAt = now`. Trong session, grade "Nhớ" cũng chuyển sang thẻ tiếp theo ngay (đúng mock); scheduling diễn ra song song.

### 2.2 `src/lib/srs-session.ts` (mới, pure functions)

```ts
type Grade = "forgot" | "hard" | "good";
type ReviewableWord = {
  key: string; zh: string; pinyin: string; meaning: string;
  level: string;         // "HSK 1" | "HSK 2" | "HSK 3"
  mem: number;           // 0–100, từ memoryStrength()
  lastLabel: string;     // "2 ngày trước" / "Hôm qua" — format(lastReviewedAt)
  isNew: boolean;        // chưa từng ôn (reviewCount === 0)
};
buildQueue(items: SrsItem[], level: string, now: number): ReviewableWord[]
  // 1) resolve key → word qua content/vocab (vocab) hoặc decks (grammar/custom)
  // 2) đến hạn (dueAt <= now) trước, rồi đến từ đang học chưa hạn
  // 3) rỗng → trả mảng rỗng, CTA đổi copy "Ôn thử tất cả"
applyGrade(item: SrsItem, grade: Grade, now: number): SrsItem  // bảng 2.1
```

`progressStore` thêm method **`recordReview(key: string, grade: Grade)`** — mutate record + phát `nhai:progress` như mọi mutation khác.

### 2.3 Độ bền trí nhớ (mem%)

Hàm pure **`memoryStrength(item, now): number`** trong `lib/stats/review.ts` — **không thêm trường mới vào `SrsItem`**, suy từ dữ liệu có sẵn:

- Base theo status: `new` = 25, `learning` = 55, `learned` = 80, `known` = 92.
- Điều chỉnh: `+ min(reviewCount, 10)` (tối đa +10); `- overdueDays × 4` khi `dueAt < now`, floor 5 (từ mới chưa ôn = 25).
- Giá trị hiển thị là **suy diễn, deterministic theo thời gian** — chấp nhận mem% thay đổi nhẹ theo ngày (đó là ý nghĩa "độ bền trí nhớ").

Ngưỡng bucket theo mock: `< 55` Yếu (rose), `55–80` Đang củng cố (amber), `> 80` Đã khắc sâu (jade). Nhãn membar: `< 50` Yếu, `< 70` Vừa, còn lại Sâu.

Hero: "X% tỉ lệ ghi nhớ TB" = trung bình `memoryStrength` của mọi item thuộc level; "~N phút ước tính" = `ceil(số từ đến hạn × 20 giây / 60)` (tối thiểu 1); "N từ cần ôn gấp" = bucket yếu.

### 2.4 Filter level

Level suy từ prefix key SRS (`hsk1.lesson-1.0` → "HSK 1"; `deck.<id>.<i>` gán level theo book của deck nếu có, fallback "HSK 2"). Danh sách level: HSK 1–3 tĩnh như mock; level không có item nào vẫn hiển thị (count 0). Filter vocab trong inspector: `all` / `urgent` (mem < 55) / `new` (`isNew`) + search substring trên `zh + pinyin + meaning`.

## 3. Component (`src/components/review/` + 2 chỉnh primitive)

Layout trang: dùng `(app)/layout.tsx` hiện có (`max-w-5xl`), gap 16 — khớp `.page` của mock (1024px). Thứ tự section: hero → buckets → inspector.

| File | Loại | API & nội dung |
|---|---|---|
| `memory-hero.tsx` | client | `{ level, count, avgMem, estMinutes, urgent, onStart }`. Kicker "TỔNG QUAN TRÍ NHỚ HÔM NAY", h1 với số tô vermilion (`.hl-num`), 3 stat, CTA `Button` size `lg` (icon Play). Label CTA: "Bắt đầu ôn tập ngay (N từ)"; queue rỗng → "Ôn thử tất cả (N từ)" |
| `srs-buckets.tsx` | client | `{ weak, cons, mast, onChipClick }`. Grid 3 cột (<760px 1 cột), card tone wash rose/amber/jade, head icon + tên + count, desc copy đúng mock, tối đa **3 chips/bucket** (hình nền card, chip chữ hanzi) — rỗng → "Trống". Click chip → phát âm |
| `vocab-inspector.tsx` | client | `{ words, onListen, onStroke }`. Toolbar: `SegmentedTabs` (Tất cả (n)/Cấp bách (n)/Từ mới) + search input local (không điều hướng — khác `SearchField` topbar, viết inline). Bảng desktop 6 cột (≥720px) / mobile-cards (<720px) từ **cùng 1 hàm map dữ liệu**. Membar + lvl chip theo membar tone. Nút mini 32px nghe/nét. Empty state "Không có từ nào khớp bộ lọc hiện tại." |
| `mem-bar.tsx` | client (pure render) | `{ value }` — track 6px + `b %` + `.lvl` pill; tone weak/mid/strong theo 2.3. Dùng lại ở cả bảng và session |
| `srs-session.tsx` | client | `{ words, onExit }`. Overlay `position: fixed inset-0 bg-surface-paper`, `role="dialog" aria-modal="true" aria-label="Phiên ôn tập"`. Topbar: nút thoát + "Từ i / N" + track 6px jade + "n nhớ". Card 480px: glyph 64px (`.hanzi`), pinyin + nghĩa ẩn đến khi reveal (click card / Space / nút "Chạm để xem nghĩa · Space"); sau reveal hiện 3 nút grade (rose/amber/primary, ≥480px 3 cột). Auto phát âm khi lật thẻ mới (`use-tts`). Hết hàng → đóng overlay + toast "Xong phiên ôn: X/N từ nhớ tốt" |
| `stroke-studio.tsx` | client | `{ word, onClose }`. Sheet `min(780px, 100%-32px)` max-h 620, mobile bottom-sheet. Head: char-tabs (mỗi chữ + số nét) + py-pill (pinyin + nút audio) + nút đóng. Body 2 cột (<720px 1 cột): (1) lưới thiên tự (`grid-cell` style) + toolbar Nét trước/Phát lại (accent)/Nét sau + speed-seg 0.75x/1x/1.5x; (2) `rad-line` bộ thủ + `order-list` bút thuận (scroll, row active viền vermilion trái). Chữ chưa có data → fallback generic + dòng "Chữ 'X' sẽ được bổ sung dữ liệu bút thuận." |

Chỉnh primitives:

- `card.tsx` — thêm prop `tone?: "rose" | "amber" | "jade"` (nền wash + border màu, map từ token wash đã có `--hz-amber-wash`…; rose dùng `bg-feedback-error/8 border-feedback-error/25`).
- `progress.tsx` — thêm prop `tone?: "jade" | "vermilion" | "amber"` cho màu fill (mặc định jade). `mem-bar` bọc `Progress` + % + nhãn; không hard-code hex.

Icon: mọi icon qua `@/components/ui/icon` (Play, Flame/Clock/CheckCircle cho buckets, Volume2, Pencil, X, ArrowLeft…).

## 4. Stroke studio — dữ liệu & `useStrokePlayer`

- **Mở rộng `useStrokePlayer`** (không viết lại): thêm `step(dir: -1 | 1)` (tắt rAF, set dashoffset theo chỉ số `cur`), `setSpeed(mult)` (DUR = 420/mult), expose `cur`. State `cur` cần phản ánh vào `order-list` — hook trả `cur` qua callback `onStep(i)` để component cập nhật UI.
- **Dữ liệu nét:** `content/hanzi-strokes.ts` mở rộng — thêm tuỳ chọn định dạng path string: `STROKE_PATH_DATA: Record<string, { py: string; total: number; rad: string; order: [string, string][]; paths: string[] }>` cho 爱/好 port từ mock (toạ độ viewBox 300). `StrokePlayer` đọc `STROKE_DATA` (polyline 0–100) trước, fallback `STROKE_PATH_DATA` (đổi viewBox), cuối cùng `genericStrokes()`.
- **Bút thuận (order list):** dữ liệu tên nét tiếng Việt nằm cùng `STROKE_PATH_DATA`. Chữ chỉ có `STROKE_DATA` (你) → order list sinh nhãn generic "Nét 1/2/…". Không có data gì → nodata.
- Audio pill: `speak(char)` qua `use-tts`, rate 0.85, lang `zh-CN`.

## 5. Accessibility & keyboard contract

Giữ 100% contract mock:

- Session: `role="dialog" aria-modal="true"`; **Space** reveal (khi chưa reveal) / phát âm lại (khi đã reveal); **1/2/3** grade; **Escape** đóng. `aria-live="polite"` trên card (glyph/py/mean) + điểm "n nhớ". Focus vào nút thoát khi mở, trả focus về CTA hero khi đóng.
- Studio: Escape đóng **trước** session (thứ tự mock); overlay click đóng; `role="img" aria-label="Hoạt họa bút thuận"` cho SVG nét.
- Mọi seg/level/tabs dùng `aria-pressed`; nút mini có `aria-label` "Nghe X" / "Xem nét viết X"; toast qua `ToastProvider` (đã có aria-live).
- Không mã hoá ý nghĩa chỉ bằng màu — membar luôn có % + nhãn; grade luôn có chữ + khoảng nghỉ.

## 6. State & flow

`review-dashboard.tsx` (viết lại, "use client") là nơi hợp nhất state: đọc `progressStore.getAllSrs()` qua pattern `mounted` + tick `nhai:progress` hiện có, tính `buildQueue`/`memoryStrength`/buckets, giữ state UI (`level`, `filter`, `query`, `sessionOpen`, `strokeWord`). `page.tsx` giữ server component chỉ export metadata + render `<ReviewDashboard />`.

Ghi grade: `recordReview()` → store phát event → dashboard re-render → mem%/bucket/due cập nhật ngay sau phiên. Session giữ snapshot queue cố định lúc mở (không tự nạp lại giữa phiên).

## 7. Testing

- **Vitest** colocated:
  - `lib/srs-session` — buildQueue (đến hạn trước, rỗng), applyGrade cả 3 grade × 3 status (dueAt/status/reviewCount đúng bảng 2.1).
  - `lib/stats/review` — memoryStrength (base theo status, cap +10, decay overdue, floor 5), ngưỡng bucket/nhãn.
  - `mem-bar` (tone theo value), `srs-buckets` (3 chips tối đa, Trống), `vocab-inspector` (filter + search + empty), `srs-session` (reveal → grade → điểm tăng, Escape đóng, key 1/2/3), `stroke-studio` (tabs chữ, speed đổi DUR — qua `onStep` spy).
  - Cập nhật `review-dashboard.test.tsx`: seed counts cũ `[12,34,8,41,96,191]` sẽ đổi — viết lại assertion theo mem%/bucket mới với fixture SrsItem tĩnh.
- **Playwright:** `e2e/personal-tools.spec.ts` giữ expectation "Thống kê học tập"? — **Không**: copy trang mới là "Trung tâm Ôn tập Ngắt quãng" → cập nhật expectation; `hydration.spec.ts` giữ `/review` trong SSR check.
- **Kiểm chứng thủ công:** dev port 3100, light/dark × viewport 420/760/1024, chạy 1 phiên ôn thật từ lesson đã học.

## 8. Rủi ro & xử lý

| Rủi ro | Xử lý |
|---|---|
| `memoryStrength` không có dữ liệu lịch sử (mọi item `reviewCount = 0`) | Bucket sẽ dồn về "Yếu" — chấp nhận: đúng thực trạng (chưa có gì được ôn); sau phiên đầu tiên mem% phân hoá |
| Mock dùng toạ độ viewBox 300 (path) khác `STROKE_DATA` 0–100 (polyline) | Hai nguồn, một thứ tự ưu tiên; `StrokePlayer` set viewBox theo nguồn — không convert mất gốc |
| Queue lớn (hàng trăm từ) làm bảng nặng | Inspector chỉ render pool đã filter; chips giới hạn 3/bucket; không phân trang (YAGNI, dữ liệu per-level nhỏ) |
| Do deps home redesign chưa execute xong | Spec này chỉ dùng thứ **đã commit** trên nhánh (token, Card/Chip/SegmentedTabs/Button/Progress); không phụ thuộc component home chưa tồn tại |
| Copy header trang ("Thống kê học tập" cũ) bị e2e khoá | Cập nhật e2e cùng PR (mục 7) |

## 9. Tài liệu cập nhật cùng lúc

- `app-next/AGENTS.md` — không cần đổi (token/primitives không đổi gốc).
- `docs/superpowers/plans/2026-10-04-review-redesign-plan.md` — tạo bằng skill writing-plans sau khi spec được duyệt.
