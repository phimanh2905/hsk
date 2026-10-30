# Phân tích Error 1102 trên byehsk + 3 phương án tối ưu cho Workers Free plan

- Ngày: 2026-10-30
- Trạng thái: **exploration doc — chưa chọn phương án** (user quyết A/B/C rồi mới viết design chi tiết + plan)
- Liên quan: plan roadmap `e7b5d01`, memory `hsk-error-1102-cpu-free-plan`

## 1. Vấn đề

Production `byehsk.softtip88.workers.dev` (Next.js 16 + OpenNext trên Cloudflare Workers) định kỳ trả **Error 1102 — "Worker exceeded resource limits"** cho người dùng (lần đầu user báo: 2026-10-29 13:21:23 UTC, Ray ID `a5227bac1a613a72`). Lỗi tái diễn, intermittent, không gắn với một URL/route cụ thể nào.

## 2. Chẩn đoán — root cause đã xác nhận bằng telemetry

**Root cause: `exceededCpu` — tài khoản đang chạy Workers FREE plan, giới hạn CPU 10 ms/request; mọi request của app SSR ăn 10–60× ngưỡng này.** Không phải hết RAM 128 MB, không có "route thủ phạm", không có bug vòng lặp.

Bằng chứng (cửa sổ logs 2026-10-29 13:44→23:59 UTC — Workers Logs chỉ hoạt động trong khoảng này):

| # | Bằng chứng | Nguồn |
|---|---|---|
| 1 | Issue `7fe51a9e` **"Worker exceeded CPU time limit."** (exception, count=3), occurrences 16:02–16:14 UTC | Workers Observability Issues |
| 2 | 3 event `outcome=exceededCpu`, **cpu=10ms** (cắt đúng ngưỡng): `/hanzi?_rsc`, `/course?_rsc` (cùng giây 16:02 — burst prefetch song song), `/api/v1/auth/get-session` (16:14) | telemetry events |
| 3 | 362 request byehsk: **median CPU 93 ms, max 633 ms**; kill-rate 3/362 ≈ 0.8% — request chết khi isolate căng (cold + burst), đa số "vượt luật" vẫn lọt nhờ built-in flexibility của runtime | telemetry calculations |
| 4 | Cùng payload `/roadmap?_rsc=gTVk…` lặp lại đo được **1576 → 596 → 356 → 348 → 110 ms**: chênh lệch = cold start vs warm; bản warm nhất (42 ms) vẫn >4× ngưỡng 10 ms | telemetry events |
| 5 | Memory loại trừ: payload lớn nhất app `/api/v1/content/shadowing` ~1.4 MB raw; burst 24 request song song qua `pnpm preview` (workerd :8787) tất cả 200, không gần 128 MB | local repro |

Lưu ý: lỗi gốc 13:21 UTC không có log (Workers Logs mới bật 13:44, khi Cloudflare Issues auto-detect qua `ContentNotFoundError` — `observability.enabled` trong wrangler config khi đó = false). Mechanism giống hệt 3 occurrence đã đo → kết luận cùng nguyên nhân.

## 3. Vì sao CPU cao (đọc codebase)

1. **Mọi request đều chạy qua Next bundle trong Worker, kể cả trang đã prerender và RSC prefetch `?_rsc=`** — asset serving của OpenNext không bypass worker cho các đường này. Cold start isolate = eval + init toàn bộ module graph Next server + app: chi phí thuần CPU, tính vào request đầu tiên.
2. **RSC prefetch nhân request**: 1 navigation của user = 2–25 request `?_rsc=` (đã đo burst 25 request/2s). Các request này thường rẻ (13–100 ms) nhưng cộng dồn CPU trên cùng isolate.
3. **Trang `ƒ` đọc D1 lúc render**: `/lesson/[book]/[page]`, `/shadowing/[...videoId]`, `/progress`, `/my-vocab`, `/my-grammar`, `/notebook/[kind]/[id]`… — SSR + better-auth session check (`src/lib/auth.ts`, getAuth lazy + cache; verify chữ ký là CPU thuần) → 100–300 ms.
4. **11 `page.tsx` import tĩnh dataset từ `src/content/`** (radicals 1508 dòng, pinyin 1405 dòng…) làm module graph phình → cold start dài hơn. (Theo kiến trúc hiện tại chỉ `vocab.ts` là seed source, phần khác vẫn runtime-import — xem memory hardcode-audit.)

Giới hạn Workers Free áp dụng (docs/limits, account `0f0cdb…` = `rate_plan: free`):

| Giới hạn | Free | Paid |
|---|---|---|
| CPU/request | **10 ms** | mặc định 30 s (tùy chọn 5′) |
| Memory/isolate | 128 MB | 128 MB |
| Requests | 100 000/ngày (1027 khi vượt) | không giới hạn |
| Subrequests | 50/request | 10 000 |
| **Requests vào static assets** | **free & unlimited, không chạy Worker** | — |

Dòng cuối là chìa khóa của phương án A.

## 4. Ba phương án

### A. Static-first + API Worker tách nhỏ — KHUYẾN NGHỊ

Chuyển Next sang build tĩnh: **mọi trang + prefetch là static assets** (Worker 0 lần invoke → 0 ms CPU, 0 quota); **16 API route** chạy trong một Worker trần nhỏ (Hono/raw fetch + better-auth + D1 — KHÔNG chứa Next bundle), mount cùng origin tại `/api/*` bằng routing run-worker-first.

- **Vì đạt mục tiêu**: ~99% traffic (pages + `_rsc`) thành asset hit miễn phí; API còn lại cold start vài ms, session check nằm dưới 10 ms (cần đo, xem §5).
- **Khả thi với repo**: 89 đường đã prerender sẵn; `/lesson/*` + `/shadowing/[videoId]` chuyển `generateStaticParams` (tập bài học hữu hạn, vocab-meta build-time biết đủ); root layout không dùng `cookies()/headers()`; `vocab-client.ts` đã có pattern client-fetch + promise-cache để các trang dynamic học theo. SEO giữ nguyên (HTML prerender; content đổi vốn đã = redeploy).
- **Đánh đổi**: server-gate (`redirect /?login=1` ở `/progress`, `/my-vocab`…) → client-gate; an toàn vì API vẫn tự check session, dữ liệu user là localStorage + rows của chính họ. Effort ~1 PR pipeline lớn (build/CI/preview) + regression flow Google OAuth (cookie path, redirect URI — path không đổi nên Google Console giữ nguyên).
- **Triển khai theo giai đoạn**:
  - **G0 (quick wins, làm ngay, có giá trị kể cả khi chưa đi tiếp)**: `prefetch={false}` cho link nặng; cache-control cho `/api/v1/content/*` (data bất biến theo deploy — `max-age` dài + `s-maxage`); thêm `"observability": { "enabled": true }` vào `wrangler.jsonc` (xem §6); seed `content_grammars` remote (xem §6).
  - **G1**: SSG toàn bộ trang `ƒ` (lesson, shadowing detail, notebook detail, session pinyin) — dữ liệu nạp client-side qua API + cache, hoặc prerender.
  - **G2**: `output: export` + port 16 API sang Worker trần; assets serve trước, chỉ `/api/*` vào Worker; cập nhật `pnpm preview`/CI/e2e.

### B. Giữ nguyên OpenNext, chỉ tune

Tắt/giảm prefetch, cache headers, bớt import `src/content`, D1 cache… **Không đạt mục tiêu** — đã đo: cold start 42–1576 ms/request, mọi request vẫn invoke Worker (vừa ăn CPU vừa ăn quota 100k/ngày). 1102 chỉ hiếm hơn, không về ~0. Chỉ chấp nhận được nếu hạ success criteria xuống "hiếm gặp là đủ"; hoặc làm một phần của G0 trong khi chờ.

### C. Bỏ hẳn Next.js — SPA tĩnh (Vite) + API Worker như A

Runtime nhẹ nhất, về lâu dài clean nhất (app vốn phần lớn client components + localStorage). Nhưng vứt App Router/`generateMetadata`/cấu trúc test hiện có, effort cao hơn A, lợi thế hơn A không nhiều ở quy mô này. Chỉ đáng cân nhắc nếu sau này chủ động rời Next.

## 5. Spike kiểm chứng trước khi cam kết A (điều kiện go/no-go)

1. **Asset hit không invoke Worker**: build export mẫu, deploy preview, đo `cf observability telemetry` — request `/roadmap` (và file `.rsc` tương ứng prefetch) phải **không xuất hiện** trong invocation logs.
2. **better-auth trên Worker trần <10 ms CPU**: Worker mẫu chỉ mount `betterAuth().handler` + D1 binding, bắn 50 request `get-session` (1 cold + 49 warm), đọc `cpuTimeMs` qua telemetry — yêu cầu p95 < 10 ms.

Hai spike này là spike thật (throwaway), chạy trên Worker/preview tạm, không đụng production.

## 6. Việc phụ phát hiện khi debug (làm độc lập, không chờ phương án)

1. **Remote D1 `hsk` thiếu seed `content_grammars`** → prod `GET /api/v1/content/grammar?level=1` **500** ("Không đọc được dữ liệu ngữ pháp"), quiz ngữ pháp roadmap đang hỏng thật. Fix: `pnpm wrangler d1 execute hsk --remote --file drizzle/seeds/content-grammars.sql` (cần user xác nhận — ghi DB production).
2. **Observability bị CI deploy ghi đè TẮT**: user bật trên dashboard, nhưng deploy 29/10 23:59 UTC theo `wrangler.jsonc` (không khai `observability`) reset về disabled (`cf workers get byehsk` → `enabled: false`; 0 event từ 00:00 UTC). Fix bền: thêm block `"observability": { "enabled": true }` vào `wrangler.jsonc` (thuộc G0).

## 7. Quyết định còn mở

- Chọn A / B / C (khuyến nghị: A, theo G0→G1→G2 + 2 spike §5).
- Nếu A: chốt vị trí API Worker (Worker riêng + routes, hay cùng Worker chứa assets với run_worker_first theo path) — thuộc design doc sau khi chọn phương án.
