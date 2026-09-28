# Shadowing library (SPEC-19) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** `shadowing.html` thành trang index thư viện video theo playlist; `shadowing-video.html` đọc data theo `?id=`.

**Architecture:** `NHAI_DATA.shadowing = {playlists:[{id,name,total,desc}], videos:[{id,title,playlistId,hsk,views,duration,viewsSuffix}]}`. `js/shadowing.js` group video theo playlist, render section + card. Thumbnail là CSS/SVG tĩnh (gradient + chữ Hán mờ), không nhúng YouTube.

**Tech Stack:** Tailwind v4, vanilla JS (defer).

**Spec:** `clone/specs/SPEC-19-shadowing-library.md`

## Global Constraints
- Ownership: `shadowing.html`, `shadowing-video.html`, `js/shadowing.js`, `js/data/shadowing.js`.
- KHÔNG sửa `js/shell.js`. Không dùng iframe YouTube (clone offline).
- Boot pattern chuẩn.

## Review Focus
- Mỗi playlist: `h2` kèm "(N bài học)" + mô tả + "XEM TẤT CẢ →" + grid 4 cột.
- Badge trên thumbnail: lượt xem, HSK3, YouTube, thời lượng.
- Click card → `shadowing-video.html?id=…` đúng tiêu đề.

---

### Task 1: Data 2 playlist + 10 video
**Files:** `clone/js/data/shadowing.js`
- [ ] Step 1: 2 playlist (`daihua` 84 bài, `baba` 111 bài) + 10 video với tiêu đề song ngữ thật, `hsk:"HSK3"`, `views`, `duration`, `viewsSuffix`.
- [ ] Step 2: `NHAI_DATA.shadowing.videoById(id)` helper.
- [ ] Step 3: Verify: `videoById` trả về đúng object.

### Task 2: Index library
**Files:** `clone/shadowing.html`, `clone/js/shadowing.js`
- [ ] Step 1: header H1 "Shadowing & Chép chính tả" + sub.
- [ ] Step 2: `render()` — mỗi playlist 1 `<section>`: `h2` tên + `(N bài học)`, `p` mô tả, link "XEM TẤT CẢ →", grid `grid-cols-2 md:grid-cols-4`.
- [ ] Step 3: `card(v)` — thumbnail 16:9 (gradient theo index + chữ Hán lớn mờ), overlay badge lượt xem (trên phải), pill HSK3 đỏ, pill YouTube xám, thời lượng (dưới phải, nền đen/70); dưới thumbnail `h3` title line-clamp-2, tên playlist nhỏ xám, pill "Shadowing".
- [ ] Step 4: card là `<a href="shadowing-video.html?id=…">`.
- [ ] Step 5: Verify theo tiêu chí SPEC-19; commit `feat(shadowing): trang thư viện video theo playlist`.

### Task 3: Trang video dùng data
**Files:** `clone/shadowing-video.html`, `clone/js/shadowing.js`
- [ ] Step 1: đọc `?id=`, hiện breadcrumb "‹ Shadowing", `h1` = title, badge HSK + thời lượng + lượt xem.
- [ ] Step 2: khung video 16:9 tĩnh + hàng nút (Phát, Tốc độ, Lặp) giữ hành vi cũ.
- [ ] Step 3: "Video liên quan" = 4 card cùng playlist, click đổi `?id=` không reload.
- [ ] Step 4: Verify: `?id` không tồn tại → fallback về video đầu tiên.
