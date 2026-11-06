# Spec: Streak đóng băng + Huy hiệu — Wave phụ

Ngày: 2026-11-06
Nguồn: RE xiehanzi `/hoc/thoi-quen/` (đóng băng chuỗi, 5 huy hiệu "chỉ trao tiến bộ thật").
Phụ thuộc: độc lập, nhét vào wave nào đang rảnh. Dùng dữ liệu progress-store có sẵn.

## 1. Streak đóng băng (freeze)

### Luật (copy xiehanzi, đơn giản hoá phase 1)

- **Kiếm**: học đủ 7 ngày liền → +1 lượt đóng băng, **giữ tối đa 2**.
- **Dùng**: lỡ đúng 1 ngày → tự consume 1 lượt, chuỗi không đứt (minh bạch: hiện dòng "Đóng băng đã giữ chuỗi hôm qua").
- **Hết lượt mà lỡ ngày**: chuỗi đứt như hiện tại.
- **Phase 2 (defer)**: cơ chế hồi sinh chuỗi đứt ≥7 ngày (3 ngày học lại để lấy, mỗi 30 ngày 1 lần).

### Data & logic

- `progress-store`: `nhai.streakFreeze` = `{ earned: number, used: number, lastEarnDate?: string }` (available = earned − used, clamp 0–2).
- `computeStreak` (`progress-client.tsx` / lib streak): khi thấy gap đúng 1 ngày và available > 0 → consume 1, chuỗi tiếp tục. Đánh dấu ngày consume vào heat map (ô màu riêng).
- Earn check chạy khi ghi studyDay (kể cả ôn tạo log) — 7 ngày liền tính cả ngày có freeze use.

### Sync

Domain nhỏ mới `gamification` (`{ streakFreeze }`), last-write-wins. Không tombstone.

## 2. Huy hiệu — chỉ trao "tiến bộ thật"

5 huy hiệu mở đầu (mốc copy xiehanzi, data từ store có sẵn):

| Huy hiệu | Điều kiện | Nguồn data |
|---|---|---|
| Thuộc 50 từ | 50 vocab ở trạng thái mature (SM-2 interval ≥21d) | review domain |
| Viết thuộc 25 chữ | 25 chữ pass quiz viết Hanzi Studio | hanzi quiz progress |
| Shadowing 30 câu | 30 câu/đoạn shadowing đạt | shadowing progress |
| Chuỗi 7 ngày | streak ≥7 | streak |
| Xong HSK 1 | trạm cuối + milestone hsk-1 pass | roadmapGates/progress |

- Rule engine thuần `src/lib/badges.ts`: `evaluateBadges(snapshot) → { id: awardedAt }` — chạy khi load `/progress` + sau các action liên quan; kết quả persist `nhai.badges`.
- Không huy hiệu "vào app n lần" — mọi điều kiện đo output thật (nguyên tắc xiehanzi).

### UI

Gallery trên `/progress`: huy hiệu đạt (màu) / chưa đạt (xám + tiến độ "0/50"). Badge mới đạt → toast 1 lần (flag `seen`).

## 3. Testing

- Unit freeze: earn ở 7 ngày, clamp 2, consume gap-1-ngày, không consume gap ≥2, timezone boundary.
- Unit badges: từng điều kiện đạt/chưa đạt, không trao lặp, seen flag.
- Component: gallery + ô heat map freeze. e2e: freeze giữ chuỗi khi mock ngày.

## 4. Out of scope

Hồi sinh chuỗi đứt (phase 2), huy hiệu theo thời gian sự kiện, bảng xếp hạng (đã có leaderboard), trang /thoi-quen riêng (nhét vào /progress).
