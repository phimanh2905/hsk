# Shell dùng chung (SPEC-00) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng shell HTML/CSS/JS dùng chung mọi trang clone (nav, modal, floating, theme, helpers).

**Architecture:** Một file `js/shell.js` tự inject DOM vào `[data-shell]` + `assets/theme.css` chứa tokens. Dữ liệu qua `window.NHAI_DATA`. Không framework, không build.

**Tech Stack:** Tailwind v4 browser CDN, vanilla JS, localStorage.

**Spec:** `clone/specs/SPEC-00-architecture.md`

## Global Constraints
- Tailwind CDN: `https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4` — mọi trang.
- JS thuần, script thường + `defer` (không `type=module` để mở được qua file://).
- Text tiếng Việt đúng y specs; link trang theo sơ đồ query-param của SPEC-00.
- Mỗi task xong: chạy `python3 -m http.server 8080` (thư mục `clone/`), kiểm tra trang bằng `curl -s` + mở trình duyệt, rồi `git add -A && git commit`.

## Review Focus
- Mở trang bằng `file://` vẫn chạy được (không dùng fetch/module).
- Dark mode toggle không vỡ layout.
- Escape + click backdrop đóng được modal/panel.
- `NHAI.speak()` không throw khi trình duyệt không có voices.

---

### Task 1: Design tokens + theme.css
**Files:** Create `clone/assets/theme.css`, `clone/js/shell.js` (khung trống), `clone/js/data/README.md`
- [ ] Step 1: Viết `theme.css`: CSS variables nền/card/border/chính/muted cho light+dark (`html.dark`), class `.btn-main`, `.btn-ghost`, `.card`, `.shadow-neo` (3px 3px 0), `.pill`, `.pill-active`, font chữ Hán, `@media print`.
- [ ] Step 2: Verify: tạo `index.html` tạm import, mở bằng server, nền kem + border 2px + shadow neo hiện đúng.

### Task 2: shell.js — Navbar + dropdown + header user + banner
**Files:** Modify `clone/js/shell.js`
- [ ] Step 1: Render navbar: logo "Nhai" (link index.html), 4 button dropdown (Nền tảng, Cá nhân hoá, Tra từ điển, Cộng đồng) — item theo SPEC-00 §1, link trang tĩnh; 6 link trực tiếp (Shadowing→shadowing.html, Bài khoá→reading.html, Luyện thi chứng chỉ→certificate-test.html, Tạo file→create-file.html, Bảng xếp hạng→leaderboard.html, Góp ý→feedback.html).
- [ ] Step 2: Dropdown mở bằng click, đóng khi click ngoài/Escape (thêm class `[data-nav-group]` quanh nav).
- [ ] Step 3: Header user: badge "0 điểm — mỗi câu trả lời đúng +1" + nút "Đăng nhập". Banner Hoàng Sa/Trường Sa 2 dòng phía trên main.
- [ ] Step 4: Mobile <768px: nút ☰ mở sidebar trượt chứa toàn bộ link.

### Task 3: Login modal + Settings panel + Floating widgets + helpers
**Files:** Modify `clone/js/shell.js`
- [ ] Step 1: Login modal (dialog): Google/Apple/HOẶC/Email/Mật khẩu/Đăng nhập/links/Close; bấm Đăng nhập → set `localStorage.nhai.mockLogin=1` + đổi nút thành avatar "T"; Escape + backdrop + Close đóng.
- [ ] Step 2: Settings panel: theme Sáng/Tối (toggle `html.dark`, lưu `nhai.theme`), giọng đọc Nữ/Nam (`nhai.voice`), 2 toggle (Bong bóng chat AI `nhai.chatBubble`, Tra từ khi bôi đen `nhai.selectionLookup` — selectionLookup: khi bật, bôi đen text hiện mini popup "Tra 'text'" link dictionary.html?q=).
- [ ] Step 3: Floating: mascot "Hỏi AI" (ảnh emoji 🤖 trong bubble) mở panel chat: header "Hỏi AI — trợ lý học tập", 1 tin nhắn chào + input + nút gửi (trả lời cứng: "Mình là bản demo — hỏi về pinyin, từ vựng hoặc bấm một bài để học nhé!"); "Nhắn tin" (toast "Tin nhắn chỉ khả dụng khi đăng nhập"); "Ủng hộ Nhai HSK" (toast "Cảm ơn bạn! ❤️").
- [ ] Step 4: Helpers: `NHAI.speak(text, lang)`, `NHAI.q(name)` đọc query param, `NHAI.toast(msg)`, `NHAI.el(html)` tạo DOM từ chuỗi.
- [ ] Step 5: Verify toàn bộ trong trình duyệt; `git add -A && git commit -m "feat(shell): shared shell, theme, helpers"`.

### Task 4: Đóng gói + template trang mẫu
**Files:** Create `clone/TEMPLATE.html` (skeleton trang chuẩn có comment), `clone/README.md` (cách chạy, sơ đồ route, quy ước cho agent khác)
- [ ] Step 1: TEMPLATE.html đầy đủ head/theme/shell/main placeholder.
- [ ] Step 2: README ghi rõ: mỗi agent chỉ được tạo/sửa file thuộc phạm vi mình (liệt kê ownership), KHÔNG sửa shell.js/theme.css.
- [ ] Step 3: `git add -A && git commit -m "chore: scaffold + docs"`.
