# Nhai HSK clone — UI-only, hardcoded data

Clone giao diện nhaihsk.com bằng **HTML tĩnh + Tailwind v4 CDN + JavaScript thuần**. Không framework, không build step.

## Chạy
```bash
cd clone
python3 -m http.server 8080
# mở http://localhost:8080
```

## Sơ đồ route (app gốc → trang tĩnh)
| App gốc | Trang clone |
|---|---|
| `/` | `index.html` |
| `/course`, `/course/hsk1?skill=grammar` | `course.html`, `course.html?book=hsk1&skill=grammar` |
| `/vocab/hsk1/lesson-1` | `lesson.html?book=hsk1&page=lesson-1` |
| `/hanzi`, `/hanzi/你` | `hanzi.html`, `hanzi.html?char=你` |
| `/radicals`, `/pinyin`, `/pinyin/practice`, `/sound-rules` | `radicals.html`, `pinyin.html`, `pinyin-practice.html`, `sound-rules.html` |
| `/roadmap`, `/roadmap/pinyin` | `roadmap.html`, `roadmap-pinyin.html?step=1..6` |
| `/review`, `/my-vocab`, `/my-grammar`, `/progress` | `review.html`, `my-vocab.html`, `my-grammar.html`, `progress.html` |
| `/shadowing`, `/shadowing/{id}` | `shadowing.html`, `shadowing-video.html?id={id}` |
| `/reading`, `/certificate-test` | `reading.html`, `certificate-test.html` |
| `/create-file`, `/create-file/{tpl}` | `create-file.html`, `create-file.html?tpl={tpl}` |
| `/leaderboard`, `/dictionary`, `/feedback` | `leaderboard.html?tab=xp|battle`, `dictionary.html?q=`, `feedback.html` |
| `/terms`, `/privacy`, `/delete-account` | `terms.html`, `privacy.html`, `delete-account.html` |

## Quy ước cho implement agents (BẮT BUỘC)
1. **KHÔNG sửa** `js/shell.js`, `assets/theme.css`, `TEMPLATE.html`, spec/plan của agent khác.
2. Mỗi agent chỉ tạo/sửa file thuộc phạm vi plan của mình (xem bảng ownership dưới).
3. Dữ liệu hardcode trong `js/data/<tên>.js` gán vào `window.NHAI_DATA.<TÊN>`; script thường + `defer`, KHÔNG `type=module`.
4. Dùng shell theo `TEMPLATE.html`; class dùng sẵn: `.card`, `.btn-main`, `.btn-ghost`, `.pill`, `.pill-active`, `.shadow-neo`, `.toast`, `.grid-cell`, `.zh`.
5. Helpers từ shell: `NHAI.q(name)`, `NHAI.toast(msg)`, `NHAI.speak(text, lang)`, `NHAI.stripTones(s)`, `NHAI.el(html)`, `NHAI.openLogin()`, `NHAI.isLoggedIn()`.
6. Copy tiếng Việt/tiếng Trung phải đúng như spec — không dùng lorem ipsum.
7. Verify trước khi xong: `python3 -m http.server 8080`, mở trang, console không lỗi.

## Ownership (mỗi file 1 agent duy nhất)
| Plan | Files |
|---|---|
| PLAN-01 | index.html, js/home.js, course.html, js/course.js, js/data/courses.js, leaderboard.html, js/leaderboard.js, js/data/leaderboard.js, feedback.html, js/feedback.js |
| PLAN-02 | lesson.html, js/lesson.js, js/lesson-*.js, js/pinyin-utils.js, js/data/vocab.js |
| PLAN-03 | hanzi.html, js/hanzi.js, js/hanzi-writer.js, js/draw-pad.js, js/data/hanzi.js |
| PLAN-04 | radicals.html, pinyin.html, pinyin-practice.html, sound-rules.html, js/radicals.js, js/pinyin.js, js/pinyin-practice.js, js/sound-rules.js, js/data/{radicals,pinyin,soundrules}.js |
| PLAN-05 | roadmap.html, roadmap-pinyin.html, review.html, my-vocab.html, my-grammar.html, progress.html, js/roadmap.js, js/roadmap-pinyin.js, js/review.js, js/my-pages.js, js/data/roadmapPinyin.js |
| PLAN-06 | shadowing.html, shadowing-video.html, js/shadowing.js, js/shadowing-video.js, js/data/shadowing.js |
| PLAN-07 | reading.html, certificate-test.html, js/reading.js, js/certificate.js, js/data/{reading,certificates}.js |
| PLAN-08 | create-file.html, js/create-file.js, js/data/templates.js |
| PLAN-09 | dictionary.html, terms.html, privacy.html, delete-account.html, js/dictionary.js, js/draw-modal.js, js/data/dictionary.js |
