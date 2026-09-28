# Shell Sidebar v2 (SPEC-10) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** Đổi shell desktop từ navbar ngang sang sidebar dọc + topbar, giữ nguyên mọi trang.

**Architecture:** Sửa `js/shell.js` renderShell: grid 2 cột (sidebar 72px fixed + content); topbar nằm trong content. Mobile giữ drawer cũ.

**Tech Stack:** Tailwind v4 CDN, vanilla JS trong shell.js.

**Spec:** `clone/specs/SPEC-10-shell-sidebar.md`

## Global Constraints
- KHÔNG đổi API `NHAI.*`; mọi trang hiện có chạy không sửa.
- Item sidebar: Trang chủ(/), Nền tảng›, Cá nhân hoá›, Tra từ điển›, Shadowing, Bài khoá, Luyện thi chứng chỉ, Tạo file, Cài đặt.
- Verify: server 8080 + computer-use AX/screenshot; commit mỗi task.

## Review Focus
- Main content phải chiếm vùng bên phải sidebar (không đè).
- Popover submenu click-outside/Escape đóng.
- Banner Hoàng Sa chuyển sang góc phải topbar-area.

---

### Task 1: Sidebar render + active state
**Files:** Modify `clone/js/shell.js`
- [ ] Step 1: renderShell → layout: `<div class="flex min-h-screen"><aside data-sidebar>…</aside><div class="flex-1"><topbar><banner><main-slot></div></div>`; main-slot chứa `[data-shell-main]` — các trang hiện có content nằm trong `<main>` sau `[data-shell]`, shell phải di chuyển DOM: move `main` vào slot sau khi inject (hoặc sidebar dùng `position:fixed; width:72px` và body `padding-left:72px` — CHỌN cách fixed+padding để không phải move DOM).
- [ ] Step 2: items icon+label; active theo `location.pathname` mapping; submenu popover `position:fixed left:76px top:<item>` mở bằng click, đóng outside/Escape.
- [ ] Step 3: Verify: mở index/course/lesson — sidebar hiện, item đúng active, không đè content.

### Task 2: Topbar (XP/bell/avatar) + banner + paper grid
**Files:** Modify `clone/js/shell.js`, `clone/assets/theme.css`
- [ ] Step 1: topbar trong content: trái = logo seal đỏ + "Nhai HSK"; phải = XP badge ⚡, chuông (popup 3 thông báo demo), avatar/login. Bỏ badge XP + nút Đăng nhập khỏi sidebar.
- [ ] Step 2: banner Hoàng Sa: absolute top-right của content, text-right, 2 dòng màu `#c0392b99`.
- [ ] Step 3: theme.css thêm `.paper-grid` background pattern; áp lên body.
- [ ] Step 4: mobile: ẩn sidebar, giữ drawer cũ + topbar thu gọn.
- [ ] Step 5: Verify toàn trang + `git commit -m "feat(shell): sidebar v2 + topbar"`.
