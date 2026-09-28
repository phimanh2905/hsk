# HSK — Clone app Nhai HSK (nhaihsk.com)

Clone **chỉ về UI** của [nhaihsk.com](https://nhaihsk.com) — app học tiếng Trung HSK 3.0 cho người Việt.
Không có backend, không framework JS, dữ liệu hardcode.

## Cấu trúc repo

```
.
├── nhaihsk-clone-proposal.md   # Báo cáo khảo sát app gốc (route, tech stack, API)
├── specs/                      # (trong clone/) Đặc tả tính năng
├── plans/                      # (trong clone/) Kế hoạch implement
└── clone/                      # Toàn bộ mã nguồn clone
    ├── index.html …            # 25+ trang tĩnh
    ├── js/                     # vanilla JS (không module, dùng defer)
    ├── assets/theme.css        # design tokens
    └── specs/ plans/           # SPEC-00..15, 10..21 · PLAN-00..15, 10..21
```

## Stack

- **HTML tĩnh** + **Tailwind v4** qua CDN (`@tailwindcss/browser@4`)
- **JavaScript thuần**, không framework, script load bằng `defer` (không `type=module` để chạy được cả `file://`)
- Dữ liệu hardcode trong `window.NHAI_DATA.*`

## Chạy thử

```bash
cd clone
python3 -m http.server 8080
# mở http://127.0.0.1:8080/index.html
```

## Quy ước

- Mọi script dùng boot pattern:
  ```js
  if (document.readyState === "complete") init();
  else document.addEventListener("DOMContentLoaded", init);
  ```
  (`defer` chạy ở `readyState === "interactive"`, nên init trước khi script sau đăng ký mode sẽ render sai.)
- Helper dùng chung qua `NHAI.*` (`js/shell.js`): `NHAI.q()`, `NHAI.toast()`, `NHAI.speak()`, `NHAI.el()`, `NHAI.openLogin()`.
- localStorage: `nhai.mockLogin`, `nhai.srs`, `nhai.decks`, `nhai.theme`, `nhai.voice`, `nhai.fileCode`.

## Tài liệu

- `nhaihsk-clone-proposal.md` — khảo sát ban đầu
- `clone/specs/GAP-ANALYSIS.md` — gap vòng 1 (so sánh clone với site gốc)
- `clone/specs/GAP-ANALYSIS-ROUND2.md` — gap vòng 2 (duyệt top→bottom toàn bộ 15 route)
- `clone/HANDOFF-computer-use-test.md` — checklist test UI

## Lưu ý

Clone mang **nội dung thương hiệu và bố cục** từ site gốc vì mục đích học tập/reverse-engineering UI.
Khi phát hành hoặc dùng thương mại, cần thay nội dung, tên và hình ảnh của Nhai HSK.
