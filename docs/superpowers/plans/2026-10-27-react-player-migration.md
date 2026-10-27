# React-Player v3 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay iframe YouTube ghép tay bằng react-player v3, sửa lỗi "Video player configuration error" (error 153) trên prod, giữ nguyên hành vi shadowing + dictation.

**Architecture:** `ShadowingStudio` render `<ReactPlayer>` (youtube-video-element, embed qua youtube-nocookie khi src chứa `-nocookie`). Engine `use-player-engine.ts` bỏ toàn bộ postMessage/handshake, điều khiển player qua ref theo interface HTMLMediaElement (`currentTime`, `play()`, `pause()`). Poll 100ms giữ nguyên nhưng đọc `playerRef.current.currentTime`. Header `Referrer-Policy` nới thành `strict-origin-when-cross-origin`.

**Tech Stack:** react-player 3.x (React 18/19, lazy + Suspense), Next.js App Router, vitest, Cloudflare Workers (OpenNext).

**Spec:** `docs/superpowers/specs/2026-10-27-react-player-migration-design.md`

## Global Constraints

- Repo dùng **pnpm** — cấm `npm install` trong `app-next` (phá node_modules).
- Không đổi data pipeline, dictation panel, TTS fallback, audio mode, phím tắt.
- Embed vẫn qua `youtube-nocookie.com` (src chứa chuỗi `-nocookie`).
- Test: `pnpm --dir app-next test` (vitest), typecheck: `pnpm --dir app-next exec tsc --noEmit`.
- Commit message tiếng Việt theo convention hiện có (`feat:`, `fix:`, `test:`).
- làm việc trên nhánh mới `react-player-migration` từ `main`.

---

### Task 1: Cài react-player + nới Referrer-Policy

**Files:**
- Modify: `app-next/package.json` (qua pnpm add)
- Modify: `app-next/next.config.ts:16-24`

**Interfaces:**
- Produces: dependency `react-player@^3` khả dụng cho import trong Task 3.

- [ ] **Step 1: Tạo nhánh + cài dependency**

```bash
cd /Volumes/samsung512/Code/hsk && git checkout -b react-player-migration
pnpm --dir app-next add react-player
```

- [ ] **Step 2: Sửa header trong `app-next/next.config.ts`**

Đổi value `same-origin` → `strict-origin-when-cross-origin` trong `headers()`:

```ts
async headers() {
  return [
    { source: "/:path*", headers: [{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }] },
  ];
}
```

Kèm comment một dòng: `// strict-origin-when-cross-origin: embed YouTube cần Referer (error 153); Kokoro TTS same-origin vẫn nhận origin.`

- [ ] **Step 3: Verify typecheck + commit**

```bash
pnpm --dir app-next exec tsc --noEmit && pnpm --dir app-next test -- --run src/content/__tests__ 2>/dev/null || true
git add -A && git commit -m "feat(shadowing): cài react-player v3 + nới Referrer-Policy strict-origin-when-cross-origin"
```

---

### Task 2: Refactor engine sang ref-driven (TDD)

**Files:**
- Modify: `app-next/src/components/shadowing/studio/use-player-engine.ts`
- Test: `app-next/src/components/shadowing/studio/__tests__/use-player-engine.test.ts`

**Interfaces:**
- Consumes: `react-player` ref = `HTMLMediaElement`-compatible (`currentTime`, `play`, `pause`, `playbackRate`, `duration`).
- Produces (Task 3 phụ thuộc):
  - `usePlayerEngine({ subs, postSink?, audioSrcs?, playerRef })` — thêm tham số `playerRef: RefObject<HTMLMediaElement | null>`.
  - Return object cũ giữ nguyên tên: `cur, playing, tts, ytReady, rate, loop, time, autoPause, setAutoPause, play, pause, togglePlay, gotoSentence, next, prev, repeat, setRate, toggleLoop, listenCurrent, speakSentence`.
  - **Thêm mới:** `playerError: boolean`, `markYtReady: () => void`, `handlePlayerError: () => void`.
  - `postSink` giữ trong signature (test dùng) nhưng không còn gọi postMessage vào iframe.

- [ ] **Step 1: Sửa test trước (failing)**

Trong `use-player-engine.test.ts`:

1. Xóa mock liên quan `document.getElementById("ytplayer")` / `contentWindow.postMessage`; thay bằng tạo fake media element:

```ts
function fakeMedia() {
  return {
    currentTime: 0, duration: 100, playbackRate: 1,
    play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(),
  } as unknown as HTMLMediaElement;
}
```

2. Mỗi render gọi `renderHook(() => usePlayerEngine({ subs, playerRef: { current: fakeMedia() } }))` (tham số `postSink` cũ bỏ khỏi các call site test YouTube).
3. Giữ nguyên các test pure `findSentenceIndex`, auto-pause, TTS fallback, audio mode (audio mode test vẫn dùng `document.getElementById("audioplayer")` — không đổi).
4. Thêm test mới:

```ts
it("seek: gotoSentence gán currentTime = start của câu", () => {
  const media = fakeMedia();
  const { result } = renderHook(() =>
    usePlayerEngine({ subs, playerRef: { current: media } }));
  act(() => result.current.gotoSentence(2, false));
  expect(media.currentTime).toBe(subs[2].start);
});

it("play/pause điều khiển media element qua ref", () => {
  const media = fakeMedia();
  const { result } = renderHook(() =>
    usePlayerEngine({ subs, playerRef: { current: media } }));
  act(() => result.current.play());
  expect(media.play).toHaveBeenCalled();
  act(() => result.current.pause());
  expect(media.pause).toHaveBeenCalled();
});

it("markYtReady tắt overlay + handlePlayerError bật playerError", () => {
  const { result } = renderHook(() =>
    usePlayerEngine({ subs, playerRef: { current: fakeMedia() } }));
  expect(result.current.playerError).toBe(false);
  act(() => result.current.handlePlayerError());
  expect(result.current.playerError).toBe(true);
  act(() => result.current.markYtReady());
  expect(result.current.ytReady).toBe(true);
});

it("poll 100ms đọc currentTime từ ref (không postMessage)", () => {
  vi.useFakeTimers();
  const media = fakeMedia();
  media.currentTime = 12.5;
  const { result } = renderHook(() =>
    usePlayerEngine({ subs, playerRef: { current: media } }));
  act(() => { result.current.markYtReady(); vi.advanceTimersByTime(250); });
  expect(result.current.time).toBeGreaterThan(0);
  vi.useRealTimers();
});
```

- [ ] **Step 2: Chạy test verify FAIL**

Run: `pnpm --dir app-next test -- --run src/components/shadowing/studio/__tests__/use-player-engine.test.ts`
Expected: FAIL — signature chưa nhận `playerRef`, `playerError` chưa tồn tại.

- [ ] **Step 3: Refactor `use-player-engine.ts`**

Thay đổi trong hook:

1. Thêm param `playerRef` vào signature; xóa `iframeEl()` và `YT_ORIGIN`.
2. `ytSend`/`ytCmd` xóa; các call site thay:
   - `ytCmd("playVideo")` + `setPlaybackRate` → `void playerRef.current?.play()`
   - `ytCmd("pauseVideo")` → `playerRef.current?.pause()`
   - `ytCmd("seekTo", [t, true])` → nếu `playerRef.current` thì `playerRef.current.currentTime = t`
   - `ytCmd("setPlaybackRate", [r])` → `playerRef.current.playbackRate = r` (thư viện cũng nhận prop `playbackRate` — engine vẫn set ref cho chắc)
3. Listener `window "message"` xóa; `markYtReady` giữ nguyên (gọi từ `onReady` của ReactPlayer).
4. Poll 100ms giữ nguyên cấu trúc (`tick`, auto-split, auto-pause, loop) nhưng điều kiện `iframeEl()?.contentWindow` bỏ, handshake `listening` bỏ — interval chỉ chạy `tick(playerRef.current?.currentTime ?? 0)` khi `!audio && !tts && ytReady`.
5. Thêm state `const [playerError, setPlayerError] = useState(false)` + `handlePlayerError = () => setPlayerError(true)`.
6. `st.current.tts` fallback 4s giữ nguyên.
7. Xóa import/useTts không đổi; cleanup comment đầu file ghi nguồn port.

- [ ] **Step 4: Chạy test verify PASS**

Run: `pnpm --dir app-next test -- --run src/components/shadowing/studio/__tests__/use-player-engine.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/shadowing/studio/use-player-engine.ts app-next/src/components/shadowing/studio/__tests__/use-player-engine.test.ts
git commit -m "feat(shadowing): engine ref-driven qua ReactPlayer ref, bỏ postMessage YouTube"
```

---

### Task 3: Studio render ReactPlayer + panel lỗi

**Files:**
- Modify: `app-next/src/app/(app)/shadowing/[...videoId]/shadowing-studio.tsx:240-262`
- Test: `app-next/src/app/(app)/shadowing/[...videoId]/__tests__/shadowing-studio.test.tsx`

**Interfaces:**
- Consumes: `usePlayerEngine` với `playerRef`, `markYtReady`, `handlePlayerError`, `playerError` (Task 2).
- Produces: trang `/shadowing/[videoId]` render video YouTube qua ReactPlayer; testid `video-overlay` vẫn tồn tại, thêm `data-testid="video-error"`.

- [ ] **Step 1: Sửa test studio trước**

Trong `shadowing-studio.test.tsx`:

1. Mock react-player (vitest `vi.mock("react-player", …)` — mock default export render `<div data-yt-src={src}>` + expose `config` qua `data-config` JSON):

```ts
vi.mock("react-player", () => {
  const { forwardRef } = require("react");
  return {
    default: forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) => (
      <div
        ref={ref}
        data-yt-src={String(props.src)}
        data-config={JSON.stringify(props.config)}
        on-ready={undefined}
      />
    )),
  };
});
```

2. Test assert:

```ts
it("render ReactPlayer với src youtube-nocookie và config origin", () => {
  render(<ShadowingStudio video={video} subtitles={subs} />);
  const p = document.querySelector("[data-yt-src]")!;
  expect(p.getAttribute("data-yt-src")).toContain("https://www.youtube-nocookie.com/embed/" + video.id);
  const cfg = JSON.parse(p.getAttribute("data-config")!);
  expect(cfg.youtube.rel).toBe(0);
});

it("onError → hiện panel lỗi data-testid=video-error", () => {
  // render rồi gọi handlePlayerError qua engine không tiện — test qua state:
  // mock engine của test hiện tại expose handlePlayerError, gọi và assert panel.
});
```

(Executor: giữ nguyên các test testid cũ — `video-overlay`, toolbar, dict-box — chỉ đổi phần mock iframe → react-player; test cũ mock `usePlayerEngine` nếu có phải bổ sung field `playerError`, `markYtReady`, `handlePlayerError`.)

- [ ] **Step 2: Chạy test verify FAIL**

Run: `pnpm --dir app-next test -- --run src/app/\(app\)/shadowing`
Expected: FAIL — chưa có `[data-yt-src]`.

- [ ] **Step 3: Sửa `shadowing-studio.tsx`**

1. Import: `import ReactPlayer from "react-player";` và thêm `const playerRef = useRef<HTMLMediaElement | null>(null);` + `const [windowOrigin, setWindowOrigin] = useState<string | undefined>(undefined);` + `useEffect(() => setWindowOrigin(window.location.origin), []);`
2. Engine call: `const eng = usePlayerEngine({ subs, postSink: enginePostSink, audioSrcs, playerRef });`
3. Thay khối iframe (dòng 240-247) bằng:

```tsx
<ReactPlayer
  ref={playerRef}
  src={"https://www.youtube-nocookie.com/embed/" + video.id + "?rel=0"}
  playing={eng.playing}
  playbackRate={eng.rate}
  playsInline
  config={windowOrigin ? { youtube: { origin: windowOrigin, rel: 0 } } : undefined}
  onReady={eng.markYtReady}
  onError={eng.handlePlayerError}
  fallback={<div className="h-full w-full animate-pulse bg-surface-muted" />}
  style={{ width: "100%", height: "100%" }}
/>
```

4. Trong overlay `{!eng.ytReady && …}` thêm trước đó panel lỗi:

```tsx
{eng.playerError && (
  <div data-testid="video-error" className="absolute inset-0 grid place-items-center bg-surface-muted p-4 text-center">
    <div>
      <p className="text-sm font-bold text-feedback-error">Không phát được video trên trang.</p>
      <a href={"https://www.youtube.com/watch?v=" + video.id} target="_blank" rel="noreferrer"
        className="mt-2 inline-block text-xs font-bold text-action-primary underline">
        Mở video trên YouTube ↗
      </a>
    </div>
  </div>
)}
```

(Overlay loading giữ `!eng.ytReady && !eng.playerError`.)

- [ ] **Step 4: Chạy test verify PASS + toàn bộ suite**

```bash
pnpm --dir app-next test -- --run "src/app/(app)/shadowing"
pnpm --dir app-next test -- --run
pnpm --dir app-next exec tsc --noEmit
```

Expected: PASS toàn bộ (baseline hiện tại: 1323 unit).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(shadowing): render ReactPlayer + panel lỗi video-error, bỏ iframe tay"
```

---

### Task 4: Kiểm tra hồi quy Kokoro TTS + e2e local

**Files:** không sửa code — chỉ verify.

**Interfaces:** Consumes app chạy dev trên :3100 (dev-login QA route có sẵn).

- [ ] **Step 1: Chạy dev server + QA journey hiện có**

```bash
pnpm --dir app-next dev  # background, port 3000; e2e Playwright chạy :3100 theo runbook cũ
```

Chạy bộ QA journey control-browser hiện có (32 case) — không case nào được fail ngoài các case phụ thuộc video YouTube thật (ghi nhận riêng, xem Task 5).

- [ ] **Step 2: Verify Kokoro TTS không hồi quy**

Trang bất kỳ dùng TTS (shadowing audio mode): network request tới Kokoro phải nhận header `Origin` như trước (`Referrer-Policy: strict-origin-when-cross-origin` vẫn gửi origin cho same-origin và cross-origin cùng scheme). Nếu bị chặn → dừng, báo lại (không tự hồi quy header).

- [ ] **Step 3: Ghi nhận kết quả vào plan (checkbox này) và commit nếu có fix nhỏ**

---

### Task 5: QA automation — kịch bản control-browser cho player mới

**Files:**
- Create: `docs/superpowers/plans/2026-10-27-react-player-qa-cases.md` (kịch bản test case, ghi kết quả PASS/FAIL từng case)

**Interfaces:** Consumes dev server :3100 + dev-login route. Video test: `EA3rwvr99Q0` (YouTube thật, cần mạng).

- [ ] **Step 1: Chạy 10 test case sau bằng control-browser (browser-use :3100), ghi PASS/FAIL từng case:**

1. **TC01 render player:** mở `/shadowing/EA3rwvr99Q0` — DOM chứa element ReactPlayer (không còn "Video player configuration error"); iframe src là `youtube-nocookie.com/embed/EA3rwvr99Q0`.
2. **TC02 overlay biến mất:** sau khi player ready (`onReady`), `[data-testid="video-overlay"]` ẩn/mất.
3. **TC03 play/pause:** nhấn nút Phát → video phát (kiểm tra `currentTime` tăng qua Evaluate JS trên ref/element); nhấn Tạm dừng → dừng.
4. **TC04 scrub/seek:** click câu thứ 3 trong transcript → player seek tới `start` câu đó (currentTime ≈ start).
5. **TC05 tốc độ:** chọn 0.75x → playbackRate của media element = 0.75.
6. **TC06 tự ngắt (auto-pause):** bật "Tự ngắt", phát — player tự pause tại mốc endMs của câu có word timing.
7. **TC07 lặp câu (L):** bật Lặp câu — khi chạm cuối câu, currentTime quay về đầu câu (không sang câu mới).
8. **TC08 dictation nghe câu mẫu:** mode Chép chính tả → "Nghe câu mẫu" → currentTime = start câu hiện tại và đang phát.
9. **TC09 karaoke highlight:** khi phát, từ có `data-active="1"` trong câu active thay đổi theo thời gian.
10. **TC10 audio mode:** mở 1 video `type=audio` (danh sách trong `/shadowing`) — `<audio data-testid="audio-player">` phát/pause/seek bình thường (không regress).

- [ ] **Step 2: FAIL nào → fix code rồi chạy lại case đó tới PASS. 10/10 PASS mới xong Task.**

- [ ] **Step 3: Commit kịch bản + kết quả**

```bash
git add docs/superpowers/plans/2026-10-27-react-player-qa-cases.md
git commit -m "test(qa): 10 test case control-browser cho ReactPlayer — kết quả PASS/FAIL"
```

---

### Task 6: Merge-ready — full gate

- [ ] **Step 1:** `pnpm --dir app-next test -- --run` PASS 100% + `pnpm --dir app-next exec tsc --noEmit` sạch.
- [ ] **Step 2:** `git log --oneline main..` review các commit; push nhánh:

```bash
git push -u origin react-player-migration
```

(Không tự merge main — chờ owner.)
