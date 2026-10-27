# Spec: Shadowing player — migrate sang react-player v3

Ngày: 2026-10-27
Trạng thái: Đã duyệt (owner OK 2026-10-27)

## 1. Bối cảnh và vấn đề

Trang `/shadowing/[videoId]` (prod: `byehsk.softtip88.workers.dev`) hiện render
YouTube player bằng **native iframe** ghép tay tại
`app-next/src/app/(app)/shadowing/[...videoId]/shadowing-studio.tsx:243`:

```
https://www.youtube-nocookie.com/embed/<video.id>?enablejsapi=1&rel=0&playsinline=1
```

và điều khiển bằng postMessage thủ công trong
`app-next/src/components/shadowing/studio/use-player-engine.ts`
(handshake `listening` → `onReady`, poll 100ms `getCurrentTime`, TTS fallback 4s).

Trên prod iframe hiển thị **"Video player configuration error"** (YouTube IFrame
API error 153 — request không kèm Referer/origin). Hai nguyên nhân:

1. `app-next/next.config.ts:16-24` đặt `Referrer-Policy: same-origin` cho mọi
   path → embed cross-origin không gửi Referer nào.
2. Src iframe thiếu tham số `origin` (bắt buộc khi `enablejsapi=1`).

## 2. Quyết định

Chủ sở hữu chốt chuyển sang thư viện **react-player v3** (npm, hiện 3.4.0)
thay vì vá iframe tay. Mục tiêu: player YouTube chạy đúng trên prod, engine giữ
nguyên hành vi shadowing + dictation.

Không đổi: data pipeline (video id từ `content_shadowing_videos`), TTS fallback,
audio mode (clip mp3 per câu), UI, phím tắt, dictation panel.

## 3. API react-player v3 (điều tra từ package 3.4.0 + youtube-video-element 1.9.1)

- `url` đổi thành **`src`**; `playsinline` → `playsInline`.
- Callback theo tên chuẩn HTMLMediaElement:
  `onReady`, `onStart`, `onPlay`, `onPlaying`, `onTimeUpdate`, `onProgress`,
  `onDurationChange`, `onRateChange`, `onSeeking`, `onSeeked`, `onWaiting`,
  `onEnded`, `onError`.
- **Ref = interface HTMLMediaElement**: `ref.current.currentTime` (đọc/ghi = seek),
  `ref.current.duration`, `ref.current.playbackRate`, `play()`, `pause()`.
  Không còn `seekTo()/getCurrentTime()/getDuration()` như v2.
- YouTube chạy qua `youtube-video-element`: **src chứa `-nocookie`** → embed qua
  `youtube-nocookie.com` (giữ domain hiện tại). Config type:
  `config={{ youtube: { origin?: string, rel?: 0|1, cc_lang_pref?, cc_load_policy?,
  color?, disablekb?, fs?, hl?, iv_load_policy?, start?, end?, playlist?,
  widget_referrer?, referrerpolicy? } }}`.
- Lazy-load mặc định qua React.lazy → cần `fallback` prop hoặc
  `next/dynamic` `ssr:false` trong Next.js App Router (player là client component).
- Lỗi phổ biến: `onEnded` không fire khi `loop=true`.

## 4. Design

### 4.1 Component render (shadowing-studio.tsx)

Thay `<iframe id="ytplayer">` bằng:

```tsx
<ReactPlayer
  ref={playerRef}
  src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`}
  playing={eng.playing}
  playbackRate={eng.rate}
  playsInline
  config={{ youtube: { origin: windowOrigin, rel: 0 } }}
  onReady={eng.markYtReady}
  onError={eng.handlePlayerError}
  fallback={<div className="aspect-video w-full animate-pulse bg-surface-muted" />}
  className="h-full w-full"
/>
```

- `windowOrigin`: state đọc `window.location.origin` trong `useEffect` sau mount
  (hydration-safe); trước mount để `undefined` — thư viện embed vẫn chạy, origin
  chỉ phục vụ postMessage.
- Không tự ghép `enablejsapi=1` — thư viện lo.
- Không còn `id="ytplayer"` — engine nhận ref thay vì `document.getElementById`.

### 4.2 Engine (use-player-engine.ts)

- Signature mới: `usePlayerEngine({ subs, postSink?, audioSrcs?, playerRef })`
  — thêm `playerRef: RefObject<HTMLMediaElement | null>` (ref của ReactPlayer).
- **Bỏ toàn bộ postMessage**: `ytSend`, `ytCmd`, handshake `listening`, listener
  `message`, constant `YT_ORIGIN`. Thay bằng đọc/ghi trực tiếp qua ref:
  - seek: `playerRef.current.currentTime = subs[i].start`
  - thời gian hiện tại: giữ **poll 100ms** đọc `playerRef.current.currentTime`
    (đồng bộ, mượt cho karaoke + auto-split + auto-pause). Không dùng
    `onTimeUpdate` vì tần suất không đảm bảo 100ms.
  - play/pause: engine tự giữ state `playing` và gọi `play()`/`pause()` trên ref
    (thay vì `ytCmd("playVideo")`).
- `markYtReady` giữ nguyên semantics (gọi từ `onReady`).
- Thêm `playerError` state + `handlePlayerError` — studio hiện thông báo lỗi
  có chủ đích (thay vì iframe treo "Video player configuration error").
- TTS fallback 4s: giữ nguyên (điều kiện `!ytReady && !tts`).
- Audio mode (`audioSrcs`): giữ nguyên `<audio id="audioplayer">`, engine
  điều khiển element — không đưa audio clip vào ReactPlayer.
- Phím tắt K/R/L/←/→, loop, auto-split, auto-pause: không đổi.

### 4.3 Dictation (dictation-panel.tsx)

Không đổi gì. Interface `DictEng { cur; listenCurrent; prev; next }` được engine
cung cấp đúng như cũ (`listenCurrent` → seek về đầu câu + play qua ref).

### 4.4 Header (next.config.ts)

`Referrer-Policy: same-origin` → **`strict-origin-when-cross-origin`** cho mọi
path. Lý do: cho phép origin đi kèm embed cross-origin (fix error 153);
request same-origin (Kokoro TTS) vẫn gửi origin như cũ nên không hồi quy.

### 4.5 Error handling

- `onError` → set `playerError`, studio render panel lỗi tiếng Việt kèm link mở
  video trên YouTube (fallback hữu ích khi video bị giới hạn embed).
- ID không hợp lệ vẫn 404 ở tầng `getShadowingVideoById` như hiện tại.

## 5. Kiểm chứng

1. Unit test: engine (mock ref thay vì mock `document.getElementById`), studio
   (ReactPlayer mock), `pnpm --dir app-next test` xanh toàn bộ.
2. QA journey: bộ test control-browser trên :3100 pass 100% (shadowing + dictation
   cả 3 mode + 2 variant).
3. Sau deploy: test tay trang prod — iframe hiện video, play/seek/tốc độ hoạt động.

## 6. Rủi ro

- `Referrer-Policy` mới phải kiểm tra lại request Kokoro TTS không hồi quy.
- react-player v3 lazy chunk: nếu Suspense/fallback gây layout shift, đặt fallback
  cùng aspect-ratio với player.
- `onEnded` YouTube qua youtube-video-element: audio mode không phụ thuộc, YouTube
  mode dùng auto-split nên không phụ thuộc `onEnded`.
