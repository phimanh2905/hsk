# Bộ spec fullstack — nhaihsk trên Next.js + Cloudflare Workers

Bộ tài liệu đủ để lập implementation plan và triển khai **fullstack + đầy đủ tính năng**. Thứ bậc nguồn chuẩn:

```
00-platform-data.md   ← HỢP ĐỒNG CANONICAL (auth · D1 schema · storage · sync · cache · API)
   ↑ tham chiếu        10–13 KHÔNG định nghĩa lại — chỉ tham chiếu 00
10-learning-core.md   B·C·D·E  home, course, lesson 7 chế độ, pinyin/radicals/sound-rules, roadmap
11-personal-tools.md  F·G1–3   thống kê, sổ tay, từ điển, hanzi, reading
12-media-documents.md G4–9     shadowing, create-file (catalog + form + in A4 + gate), chứng chỉ
13-social-monetization-ai.md  A1b·A5·H1–4 + SP4 (MoMo/Stripe/mã) + SP5 (AI/TTS/nhận dạng vẽ)
```

Cùng với 2 tài liệu nền:

- `../2026-09-30-hsk-nextjs-workers-migration-design.md` — kiến trúc tổng thể + phân rã SP1–SP5
- `../2026-09-30-hsk-feature-inventory.md` — kê khai ~60 tính năng (ID A1–H4) + trạng thái [PORT]/[UPG-x]/[DEMO]

Và đặc tả hành vi chi tiết của clone (nguồn chân lý về UX): `clone/specs/SPEC-01..21.md`.

## Cách đọc khi làm 1 sub-project

| SP | Đọc |
|---|---|
| SP1 (port) | inventory cột [PORT] + 10/11/12/13 mục "hiện trạng SP1" + SPEC-01..21 |
| SP2 (auth/sync) | 00 §2–§6 + 13 (A1b, H1, H2, H4) + 10/11 mục UPG-2 |
| SP3 (content) | 10 (B3, D5) + 11 (G1/G2 dataset) + 12 (G4 thư viện) |
| SP4 (monetization) | 00 §3.4 + 13 (SP4) |
| SP5 (AI/TTS) | 13 (SP5) + 11 (G3 karaoke) + 12 (G7 Format-AI) |

## Quy ước chung

- Feature ID (A1–H4) theo feature inventory — mọi acceptance criteria gắn ID.
- Mọi endpoint chỉ dùng catalog 00 §8; thứ ngoài phải ghi `[CẦN DUYỆT]`.
- SP1 port đúng hành vi mock; nâng cấp thật là việc của UPG-2/3/4/5 — tách bạch trong từng spec.
