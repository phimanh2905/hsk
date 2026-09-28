# SPEC-19: /shadowing = thư viện video theo playlist (trang index mới)

## Bối cảnh
Vòng 2: `/shadowing` ở gốc là trang **index thư viện**, nhóm video theo playlist, mỗi playlist là 1 section. Clone chỉ có `shadowing.html` (1 trang video đơn) + `shadowing-video.html`. Chi tiết: `GAP-ANALYSIS-ROUND2.md` GAP-10.

## A. Khung trang
- `<title>Shadowing | Nhai HSK`, H1 **"Shadowing & Chép chính tả"**, sub "Chọn video để luyện nghe, bắt chước phát âm hoặc viết chính tả."

## B. Mỗi playlist = 1 section
```
<section class="mb-10">
  <h2>呆話西遊 <span class="text-muted">(84 bài học)</span></h2>
  <p class="text-sm text-muted">DaihuaXiyou Official – Laugh out your six-pack abs! …</p>
  <a class="text-xs font-bold text-[var(--nhai-main)]">XEM TẤT CẢ →</a>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3"> … card video … </div>
</section>
```
- `h2` = tên kèm số bài trong ngoặc; mô tả 1 dòng; link "XEM TẤT CẢ →" (bỏ qua hành vi, `href="#"`, có thể dẫn `#` + toast "Sẽ có sớm").
- Grid 4 cột (2 trên mobile).

## C. Card video
- Thumbnail 16:9 bo góc: nền gradient theo index, chữ Hán lớn mờ ở giữa làm poster tĩnh (không nhúng YouTube), overlay **trên góc phải** 3 badge xếp dọc: số lượt xem (`397`), cấp HSK (`HSK3` pill đỏ), nguồn (`YouTube` pill xám), và **thời lượng** (`2:46`) ở góc dưới phải trên nền đen.
- Dưới thumbnail: `h3` tiêu đề (tiếng Trung, 2 dòng, `line-clamp-2`), tên playlist nhỏ xám, loại "Shadowing" pill.
- Click card → `shadowing-video.html?id=<videoId>`.

## D. Data
`NHAI_DATA.shadowing = { playlists:[ {name, total, desc}, … ], videos:[ {id, title, playlist, hsk, views, duration, viewsSuffix}, … ] }`
Hardcode **2 playlist**: `DaihuaXiyou 呆話西遊 (84 bài học)`, `我的爸爸是條龍 (111 bài học)`; **10 video** (5 mỗi playlist) với tiêu đề song ngữ thật:
- 墓碑上的QR碼，別掃。QR code on the tombstone, don't scan. #daihuaxiyou #呆話西遊 — 397 · HSK3 · YouTube · 2:46
- 就這智商，還佔便宜？With that IQ, Still trying take advantage? #呆話西遊 — 75 · 1:06
- 又要漲工資？！#呆話西遊 #daihuaxiyou #搞笑 — 29 · 2:21
- Why does he always drive me crazy?! 😡😂 #daihoo #plush #animation #dubbing — 11 · 1:01
- 【我的爸爸是條龍】原來和老婆一起洗澡是這麽刺激的事情… #恩愛 #夫妻 — 47 · 1:18
- 【我的爸爸是條龍】孩子：爸媽總在我面前秀恩愛？！Being PDA in front of our SON… — 12 · 3:04
- + 4 video nữa cùng kiểu.

## E. `shadowing-video.html` bổ sung
Giữ trang hiện có, dùng `NHAI_DATA.shadowing` để lấy title/hsk/duration theo `?id=`; breadcrumb "‹ Shadowing"; nút "Video liên quan" dưới cùng = 4 card từ cùng playlist.

## Tiêu chí nghiệm thu
- `/shadowing` render 2 section playlist, mỗi section có h2 + số bài + mô tả + "XEM TẤT CẢ" + lưới 4 card.
- Card có thumbnail 16:9, badge lượt xem / HSK / YouTube / thời lượng, tiêu đề tiếng Trung, tên playlist, pill "Shadowing".
- Click card sang `shadowing-video.html?id=…` và trang đó hiện đúng tiêu đề + video liên quan.
- Grid responsive 4→2 cột.
