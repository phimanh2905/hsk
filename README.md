# HSK — Nhai HSK (app học tiếng Trung HSK 3.0 cho người Việt)

Repo gồm hai phần:

| Thư mục | Vai trò |
|---|---|
| **`app-next/`** | **Ứng dụng thật** — Next.js App Router + TypeScript + Tailwind v4, deploy Cloudflare Workers (OpenNext). Đây là code đang chạy production. |
| `clone/` | Bản HTML/JS tĩnh tham chiếu (UI gốc, không build step) — dùng để đối chiếu khi port, không deploy. |

🌐 **Bản chạy thật:** https://byehsk.softtip88.workers.dev

## Stack của `app-next/`

- Next.js 16 (App Router, SSG/ISR) · TypeScript strict · Tailwind v4 **compiled** (không còn CDN)
- Cloudflare Workers qua `@opennextjs/cloudflare` + Wrangler
- Tiến độ học lưu `localStorage` (prefix `nhai.*`) qua interface duy nhất `ProgressStore`
  (`src/lib/store/progress-store.ts`) — SP2 mới thay bằng D1 + `HybridStore`
- Test: Vitest + Testing Library (271 test) · Playwright (25 e2e)

## Lệnh thường dùng

```bash
cd app-next
pnpm dev          # dev server (dùng port trống, ví dụ -p 3100)
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm test         # vitest run
pnpm test:e2e     # playwright test (tự bật dev server)
pnpm preview      # build rồi chạy worker bằng workerd ở :8787
pnpm run deploy   # build rồi deploy lên Cloudflare Workers
```

## Deploy

**Qua CI (đang dùng):** push lên `main` → GitHub Actions chạy
`typecheck → lint → test → build → deploy`. Cần 2 secret trong repo:

| Secret | Giá trị |
|---|---|
| `CLOUDFLARE_API_TOKEN` | API token tạo ở Cloudflare → My Profile → API Tokens, quyền **Workers Scripts: Edit** (không phải token OAuth dùng trên máy) |
| `CLOUDFLARE_ACCOUNT_ID` | `0f0cdb9ddcb4ce7cfd8d9fee973f6ef3` |

```bash
gh secret set CLOUDFLARE_API_TOKEN  --repo phimanh2905/hsk
gh secret set CLOUDFLARE_ACCOUNT_ID --repo phimanh2905/hsk
```

**Từ máy (không cần token):** `wrangler login` một lần, rồi `pnpm run deploy`.

### Ba cái bẫy đã gặp, đừng lặp lại

1. **`NEXT_PUBLIC_SITE_URL`** nằm trong `app-next/.env.production` (đã commit, là URL công khai
   chứ không phải secret) — dùng cho `metadataBase`, `sitemap.xml`, `robots.txt`.
   Đổi URL thì sửa file này. **Không** truyền env rỗng trong CI: chuỗi rỗng sẽ đè file
   `.env` và làm `new URL("")` nổ lúc build.
2. **Next cache SSG**: đổi `NEXT_PUBLIC_SITE_URL` mà không xoá `.next` thì `sitemap.xml`
   vẫn giữ URL cũ. Script `deploy`/`preview` đã có `rm -rf .next` — đừng bỏ.
3. **`opennextjs-cloudflare deploy` không tự build**, nó chỉ đẩy thư mục `.open-next`
   có sẵn. Luôn `build && deploy` (đã nằm trong script `deploy`).

Ngoài ra, `pnpm/action-setup` trong CI phải trỏ `package_json_file: app-next/package.json`
vì repo root không có `package.json` nên không có trường `packageManager`.

## Tài liệu

- `docs/superpowers/specs/fullstack/` — **spec kỹ thuật đầy đủ**: `00-platform-data.md`
  (hợp đồng chung: auth, schema D1, storage, sync, cache, API) + `10`–`13` theo domain.
  Đọc `README.md` trong thư mục đó để biết đọc gì khi làm từng sub-project.
- `docs/superpowers/plans/` — implementation plan của SP1 (4 plan, 64 task, đã thực hiện xong).
- `docs/superpowers/specs/2026-09-30-hsk-feature-inventory.md` — kê khai tính năng + trạng thái port.
- `clone/specs/GAP-ANALYSIS*.md`, `nhaihsk-clone-proposal.md` — khảo sát site gốc.

## Lộ trình

- **SP1 (xong, đang chạy):** port toàn bộ UI sang Next.js — 28 route, 7 chế độ bài học,
  thư viện shadowing, công cụ tạo file luyện viết, trang thống kê/sổ tay, trang social.
- **SP2 (chưa làm):** đăng nhập thật (better-auth) + DB D1 + đồng bộ tiến độ đa thiết bị.
  Hiện mọi thứ vẫn nằm trong `localStorage` của từng máy.
- **SP3–SP5:** nội dung HSK thật (đang là dữ liệu demo), leaderboard thật, thanh toán
  MoMo/Stripe, AI chat + TTS server.

### Việc còn treo

- **Gắn domain riêng (chưa làm):** Cloudflare Dashboard → Workers & Pages → `byehsk` →
  Settings → Domains & Routes → thêm custom domain (vd `app.nhaihsk.com`). Xong nhớ sửa
  `NEXT_PUBLIC_SITE_URL` trong `app-next/.env.production` rồi deploy lại để sitemap/canonical
  trỏ domain mới.
- **Xem bản in A4:** `/create-file` → kiểm tra bằng mắt một lần (selector `@media print`
  đã có test tự động, nhưng layout thật nên in thử).

## Lưu ý pháp lý

Nội dung thương hiệu và bố cục trong `clone/` (và phần UI tương ứng ở `app-next/`) được
mang từ nhaihsk.com cho mục đích học tập/reverse-engineering. Khi phát hành hoặc dùng
thương mại, cần thay nội dung, tên và hình ảnh của Nhai HSK.