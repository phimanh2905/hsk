# Bộ plan 8 wave — HSK 1–5 roadmap (2026-10-24)

Spec nguồn: `docs/superpowers/specs/2026-10-24-hsk15-roadmap-design.md` (commit `4b3c30f`). Tất cả plan đã qua review chéo ngày 2026-10-24 (header chuẩn, không placeholder, coverage đủ mọi mục W*.* của spec).

## Thứ tự thực thi (bắt buộc)

```
Wave 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7
```

- Wave 7 độc lập — có thể kéo sớm bất kỳ lúc nào sau Wave 0.
- Wave 5 có prerequisite cứng: Wave 4 phải merge trước (xem đầu plan wave 5).
- Mỗi wave = 1 sub-project: thực thi bằng superpowers:subagent-driven-development hoặc executing-plans theo đúng blockquote trong plan.

## Số migration: CHỈ MANG TÍNH CHỈ ĐẦU

Các plan viết song song nên trùng nhau phím số migration (W2 & W4 cùng ghi "0005"; W3 & W5 cùng ghi "0006"). Khi thực thi: **số thứ tự thật do `pnpm drizzle-kit generate` gán theo thời điểm sinh**. Executor bỏ qua số trong plan, chỉ cần đúng NỘI DUNG migration và đúng thứ tự wave. Nguyên tắc: KHÔNG sửa migration đã commit; wave sau luôn sinh migration mới kế tiếp.

## Ledger interface chéo (đã verify nhất quán)

- **Wave 0 → Wave 3**: ProgressStore `getReadingDrafts()/saveReadingDraft(text)` (ReadingDraft `{text, at}`); thêm `getHanziQuiz/listHanziQuiz/recordHanziQuiz(ch, score?)`, `getSoundRulesBest/recordSoundRulesResult(correct)`.
- **Wave 2 → Wave 3**: dữ liệu vocab đã review tại `app-next/scripts/content/data/vocab/hskN.json` + `lessons-hskN.json`; content layer grammar `src/lib/content/grammar.ts` + `GET /api/v1/content/grammar`.
- **Wave 4 → Wave 5/6**: bảng `srs_cards`/`study_day`/`lesson_progress`; API `hybridMarkDirty(domain)` domain `"srs"|"studyDay"|"lessonProgress"`; payload `/api/v1/sync` `{srs, studyDay, lessonProgress}`. Wave 5 mở rộng ADDITIVE: domain `"reviewLogs"` + cột SM-2 (`ease/interval_days/lapses`) + enum status mới, bảng `review_logs` (breaking có chủ đích, mọi consumer cập nhật trong plan wave 5). Wave 6 không đụng study_day (battle có bảng riêng `battle_attempts`).
- **Wave 3 → Wave 6**: audio đề thi chỉ định nghĩa cấu trúc (`audioUrl?` + cues); UI render khi thiếu audio.
- **LLM endpoint (chung W2/W3/W7)**: OpenAI-compatible, model `smart-router/fallback`; env `CONTENT_LLM_*` (batch) và secret `AI_UPSTREAM_URL/AI_UPSTREAM_KEY` (assistant). KHÔNG BAO GIỜ commit key.

## Phát hiện quan trọng khi viết plan (đã verify code)

- `scripts/vendor/hsk.json` hiện có là chuẩn HSK 2.0 → W2 dùng dataset ngoài `ivankra/hsk30` (MIT).
- Branch `my-grammar-d1` là user-data (notebook_entries kind grammar), không phải content → W2 làm `content_grammars` song song theo pattern `content_vocabs`.
- Shadowing: studio thật ở `src/app/(app)/shadowing/[videoId]/shadowing-studio.tsx`; seed hiện có 4/20 video phụ đề; video id = YouTube ID (không có cột youtubeId).
- `battle.tsx` đã tồn tại (mode đấu trí 13 câu) → W6 nâng cấp, không viết mới.
- Grade SRS đổi `forgot`→`again` + thêm `easy` (breaking, W5).
