"use client";
/* Engine phát — tách nguyên vẹn từ video-player.tsx (postMessage YouTube,
   polling 500ms, TTS fallback 4s). Khác biệt duy nhất (spec §3.4):
   - auto-split thành state (default true), không đọc DOM
   - thêm loop: chạm cuối câu khi playing → seek về đầu câu thay vì pause
   - phím: K=play/pause, R=nghe mẫu, L=loop, ←/→=chuyển câu. Space do record dock phụ trách. */
import { useEffect, useRef, useState } from "react";
import { useTts } from "@/lib/tts/use-tts";
import type { SubtitleSentence } from "@/content/shadowing";

const YT_ORIGIN = "https://www.youtube-nocookie.com";

/* Port tick của clone: chọn câu theo thời gian (t ngoài range → câu cuối nếu
   t ≥ end cuối, ngược lại câu 0). Pure — export riêng để unit test. */
export function findSentenceIndex(subs: SubtitleSentence[], t: number): number {
  for (let i = 0; i < subs.length; i++) if (t >= subs[i].start && t < subs[i].end) return i;
  return t >= subs[subs.length - 1].end ? subs.length - 1 : 0;
}

export function usePlayerEngine({ subs, postSink }: { subs: SubtitleSentence[]; postSink?: (msg: string) => void }) {
  const { speak, cancel: ttsCancel } = useTts();
  // iframe do Task 8 render và gắn qua window ("ytplayer"); engine tìm nó lúc gửi lệnh.
  const iframeEl = () => document.getElementById("ytplayer") as HTMLIFrameElement | null;

  // stateRef = mirror của clone state — KHÔNG đưa playback vào React state
  const st = useRef({
    cur: 0,
    playing: false,
    rate: 1,
    tts: false,
    ytReady: false,
    lastTime: 0,
    loop: false,
    autoSplit: true,
  });

  // slice hiển thị
  const [cur, setCur] = useState(0);
  const [ytReady, setYtReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [tts, setTts] = useState(false);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [autoSplit] = useState(true); // Task 8 có thể nâng thành state điều khiển từ settings
  st.current.autoSplit = autoSplit;

  const sinkRef = useRef(postSink);
  sinkRef.current = postSink;

  /* ---------- điều khiển YouTube (postMessage) — port shadowing-video.js:52-56 ---------- */
  function ytSend(obj: Record<string, unknown>) {
    sinkRef.current?.(JSON.stringify(obj));
    if (st.current.tts || !iframeEl()?.contentWindow) return;
    try { iframeEl()!.contentWindow!.postMessage(JSON.stringify(obj), YT_ORIGIN); } catch { /* silent */ }
  }
  function ytCmd(func: string, args: unknown[] = []) { ytSend({ event: "command", func, args }); }

  /* ---------- handshake + listener message — port shadowing-video.js:58-84 ---------- */
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!/^https:\/\/(www\.)?(youtube-nocookie|youtube)\.com$/.test(e.origin)) return;
      let data: Record<string, unknown>;
      try { data = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
      if (!data || typeof data !== "object") return;
      if (data.event === "onReady" || (data.infoDelivery as { playerData?: unknown } | undefined)?.playerData) markYtReady();
      const pd = (data.infoDelivery as { playerData?: { currentTime?: number; playerState?: number } } | undefined)?.playerData;
      if (pd && typeof pd.currentTime === "number") {
        st.current.lastTime = pd.currentTime;
        if (typeof pd.playerState === "number") { st.current.playing = pd.playerState === 1; setPlaying(pd.playerState === 1); }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cleanup: hủy TTS đang phát khi unmount
  useEffect(() => () => { try { ttsCancel(); } catch { /* silent */ } }, [ttsCancel]);

  function markYtReady() {
    if (st.current.ytReady) return;
    st.current.ytReady = true;
    setYtReady(true); // Ruling Task 5 review: render-from-ref → React state
    ytCmd("setPlaybackRate", [st.current.rate]);
  }

  /* onIframeLoad của video-player cũ (gửi handshake "listening" khi iframe load)
     chuyển sang Task 8 cùng với <iframe> — hook không render DOM. */

  /* ---------- polling 500ms — port shadowing-video.js:87-107 ---------- */
  useEffect(() => {
    const id = setInterval(() => {
      if (st.current.tts) return;
      // iframe có thể onLoad TRƯỚC khi hydration gắn handler → handshake "listening" mất,
      // widget không bao giờ nhận onReady và overlay kẹt. Gửi lại handshake mỗi nhịp cho tới khi sẵn sàng.
      if (!st.current.ytReady) {
        ytSend({ event: "listening", id: "bye-yt", channel: "widget" });
        return;
      }
      ytCmd("getCurrentTime");
      tick(st.current.lastTime);
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs]);

  function tick(t: number) {
    const idx = findSentenceIndex(subs, t);
    if (idx !== st.current.cur) { st.current.cur = idx; setCur(idx); return; }
    // tự ngắt câu: dừng ở cuối câu đang phát (loop → quay về đầu câu)
    if (st.current.playing && st.current.autoSplit && t >= subs[st.current.cur].end - 0.15) {
      if (st.current.loop) { ytCmd("seekTo", [subs[st.current.cur].start, true]); return; }
      pause();
    }
  }

  /* ---------- fallback TTS 4s — port shadowing-video.js:110-118 ---------- */
  useEffect(() => {
    const id = setTimeout(() => {
      if (!st.current.ytReady && !st.current.tts) {
        st.current.tts = true;
        setTts(true);
        // khớp clone shadowing-video.js:110-118 — chỉ tự phát khi đang playing
        if (st.current.playing) speakCurrent();
      }
    }, 4000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function speakSentence(i: number, onend?: () => void) {
    const s = subs[i];
    speak(s.parts.map((p) => p.zh).join(" "), {
      lang: "zh-CN",
      rate: st.current.rate,
      onEnd: onend ? () => { if (st.current.playing && st.current.tts) onend(); } : undefined,
    });
  }
  function speakCurrent() {
    speakSentence(st.current.cur, () => {
      // hết câu → sang câu tiếp theo (chế độ TTS phát liên tục); loop → lặp lại câu
      if (st.current.loop) { speakCurrent(); return; }
      if (st.current.cur + 1 < subs.length) {
        st.current.cur += 1;
        setCur(st.current.cur);
        speakCurrent();
      } else {
        pause();
      }
    });
  }

  /* ---------- play / pause / câu — port shadowing-video.js:153-182 ---------- */
  function play() {
    st.current.playing = true; setPlaying(true);
    if (st.current.tts) speakCurrent();
    else { ytCmd("playVideo"); ytCmd("setPlaybackRate", [st.current.rate]); }
  }
  function pause() {
    st.current.playing = false; setPlaying(false);
    if (st.current.tts) { try { ttsCancel(); } catch { /* silent */ } } else ytCmd("pauseVideo");
  }
  const togglePlay = () => { if (st.current.playing) pause(); else play(); };

  function gotoSentence(i: number, autoplay: boolean) {
    const clamped = Math.min(Math.max(i, 0), subs.length - 1);
    st.current.cur = clamped;
    if (st.current.tts) {
      if (st.current.playing || autoplay) { st.current.playing = true; setPlaying(true); speakCurrent(); }
      else setCur(clamped);
    } else {
      ytCmd("seekTo", [subs[clamped].start, true]);
      if (autoplay && !st.current.playing) play();
    }
    setCur(clamped);
  }
  const next = () => gotoSentence(st.current.cur + 1, st.current.playing);
  const prev = () => gotoSentence(st.current.cur - 1, st.current.playing);
  const repeat = () => gotoSentence(st.current.cur, true);

  const setRatePublic = (r: number) => {
    st.current.rate = r; setRate(r);
    if (!st.current.tts) ytCmd("setPlaybackRate", [r]);
  };
  const toggleLoop = () => { st.current.loop = !st.current.loop; setLoop(st.current.loop); };

  /* ---------- phím tắt — K=play/pause, R=nghe mẫu, L=loop, ←/→=chuyển câu.
     Space KHÔNG nằm ở engine (record dock đăng ký hold-to-record riêng). ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ((t.matches && t.matches("input, textarea, select")) || t.isContentEditable)) return;
      if (e.key === "k" || e.key === "K") { e.preventDefault(); togglePlay(); }
      else if (e.key === "r" || e.key === "R") { e.preventDefault(); listenCurrent(); }
      else if (e.key === "l" || e.key === "L") { e.preventDefault(); toggleLoop(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- autoscroll câu active: capability giữ qua `cur` — Task 8 (transcript
     panel) tự đăng ký effect trên cur và đọc pref getAutoscroll() để scrollIntoView. ---------- */

  /* ---------- nghe lại câu — port shadowing-video.js ---------- */
  const listenCurrent = () => {
    if (tts) speakSentence(cur);
    else { ytCmd("seekTo", [subs[cur].start, true]); ytCmd("playVideo"); }
  };

  return {
    cur,
    playing,
    tts,
    ytReady,
    rate,
    loop,
    play,
    pause,
    togglePlay,
    gotoSentence,
    next,
    prev,
    repeat,
    setRate: setRatePublic,
    toggleLoop,
    listenCurrent,
    speakSentence: (i: number) => speakSentence(i),
  };
}
