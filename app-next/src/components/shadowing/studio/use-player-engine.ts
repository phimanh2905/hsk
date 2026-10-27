"use client";
/* Engine phát — điều khiển player qua ref interface HTMLMediaElement (ReactPlayer
   v3 / youtube-video-element extends HTMLVideoElement): currentTime = seek, play(),
   pause(), playbackRate. Poll 100ms đọc currentTime từ ref (bỏ postMessage YouTube).
   - auto-split thành state (default true), không đọc DOM
   - loop: chạm cuối câu khi playing → seek về đầu câu thay vì pause
   - phím: K=play/pause, R=nghe mẫu, L=loop, ←/→=chuyển câu. Space do record dock phụ trách. */
import { useEffect, useRef, useState, type RefObject } from "react";
import { useTts } from "@/lib/tts/use-tts";
import type { SubtitleSentence } from "@/content/shadowing";
import { getAutoPause, setAutoPause } from "@/lib/shadowing/prefs";
import { sentencePauseMs } from "@/lib/shadowing/auto-pause";

/* Port tick của clone: chọn câu theo thời gian (t ngoài range → câu cuối nếu
   t ≥ end cuối, ngược lại câu 0). Pure — export riêng để unit test. */
export function findSentenceIndex(subs: SubtitleSentence[], t: number): number {
  for (let i = 0; i < subs.length; i++) if (t >= subs[i].start && t < subs[i].end) return i;
  return t >= subs[subs.length - 1].end ? subs.length - 1 : 0;
}

export function usePlayerEngine({
  subs,
  postSink: _postSink,
  audioSrcs,
  playerRef,
}: {
  subs: SubtitleSentence[];
  postSink?: (msg: string) => void;
  audioSrcs?: string[];
  playerRef: RefObject<HTMLMediaElement | null>;
}) {
  const { speak, cancel: ttsCancel } = useTts();
  /* T7 — chế độ audio: studio render <audio id="audioplayer"> với src theo câu
     (audioSrcs[index]); engine điều khiển element này thay vì media ref.
     audioSrcs undefined/[] → mode YouTube. */
  const audioMode = !!audioSrcs && audioSrcs.length > 0;
  const audioEl = () => document.getElementById("audioplayer") as HTMLAudioElement | null;

  // stateRef = mirror của clone state — KHÔNG đưa playback vào React state
  const st = useRef({
    cur: 0,
    playing: false,
    rate: 1,
    tts: false,
    ytReady: false,
    loop: false,
    autoSplit: true,
    audio: false, // T7: mode audio → mọi lệnh media thành no-op, TTS fallback tắt
    autoPause: getAutoPause(), // Task 5 — toggle tạm dừng theo word timing (spec WSD.3)
  });

  // slice hiển thị
  const [cur, setCur] = useState(0);
  const [ytReady, setYtReady] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [tts, setTts] = useState(false);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [time, setTime] = useState(0); // giây — cập nhật mỗi nhịp poll (Task 6 karaoke đọc)
  // SSR render false — giá trị localStorage chỉ đọc lại sau mount (useEffect) vì
  // hydration không patch thuộc tính DOM sai khác giữa server và client.
  const [autoPause, setAutoPauseState] = useState(false);
  const [autoSplit] = useState(true); // Task 8 có thể nâng thành state điều khiển từ settings
  st.current.autoSplit = autoSplit;
  st.current.audio = audioMode;

  // Task 5 — auto-pause nhớ localStorage: sync sau mount (hydration-safe)
  useEffect(() => {
    const saved = getAutoPause();
    if (saved) {
      st.current.autoPause = true;
      setAutoPauseState(true);
    }
  }, []);

  function markYtReady() {
    if (st.current.ytReady) return;
    st.current.ytReady = true;
    setYtReady(true); // Ruling Task 5 review: render-from-ref → React state
    if (playerRef.current) playerRef.current.playbackRate = st.current.rate;
  }
  function handlePlayerError() {
    setPlayerError(true);
  }
  /* Sync playing state từ player events (onPlay/onPause của ReactPlayer) — YT có thể
     tự pause (buffer, autoplay policy); engine cũ đọc playerState từ postMessage,
     engine ref-driven phải sync qua callback để không mất đồng bộ nút Phát. */
  function syncPlaying(on: boolean) {
    if (st.current.audio || st.current.tts) return;
    if (st.current.playing === on) return;
    st.current.playing = on;
    setPlaying(on);
  }

  /* ---------- T7 — điều khiển <audio id="audioplayer"> (clip mp3 theo câu) ---------- */
  function seekAudio(i: number) {
    const el = audioEl();
    if (!el) return;
    // start là mốc toàn bài; clip per-câu ngắn hơn → mốc vượt độ dài clip thì về 0
    el.currentTime = subs[i].start < (el.duration || Infinity) ? subs[i].start : 0;
  }
  function audioPlay() {
    try {
      const p = audioEl()?.play();
      if (p && typeof p.catch === "function") p.catch(() => { /* 404/no source */ });
    } catch { /* silent */ }
  }

  // clip mp3 hết → tự sang câu tiếp (loop → replay câu); hết danh sách → pause
  useEffect(() => {
    if (!st.current.audio) return;
    const el = audioEl();
    if (!el) return;
    const onEnded = () => {
      if (st.current.loop) { seekAudio(st.current.cur); audioPlay(); return; }
      if (st.current.cur + 1 < subs.length) gotoSentence(st.current.cur + 1, true);
      else pause();
    };
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs]);

  /* ---------- polling 100ms — đọc currentTime từ media ref (Task 5: 500→100ms cho karaoke mượt) ---------- */
  useEffect(() => {
    const id = setInterval(() => {
      if (st.current.audio) return; // T7: mode audio do 'ended' điều khiển, không polling
      if (st.current.tts) return;
      if (!st.current.ytReady) return; // onReady (ReactPlayer) đánh thức poll
      tick(playerRef.current?.currentTime ?? 0);
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs]);

  function tick(t: number) {
    setTime(t);
    // auto-pause theo word timing (spec WSD.3): dừng tại endMs từ cuối câu;
    // loop bật → quay về đầu câu thay vì dừng (giữ ưu tiên như autoSplit bên dưới)
    if (st.current.playing && st.current.autoPause) {
      const s = subs[st.current.cur];
      const pauseMs = sentencePauseMs(s.words, s.end * 1000);
      if (pauseMs != null && t * 1000 >= pauseMs - 60) {
        if (st.current.loop) {
          if (playerRef.current) playerRef.current.currentTime = subs[st.current.cur].start;
          return;
        }
        pause();
        return;
      }
    }
    const idx = findSentenceIndex(subs, t);
    if (idx !== st.current.cur) { st.current.cur = idx; setCur(idx); return; }
    // tự ngắt câu: dừng ở cuối câu đang phát (loop → quay về đầu câu)
    if (st.current.playing && st.current.autoSplit && t >= subs[st.current.cur].end - 0.15) {
      if (st.current.loop) {
        if (playerRef.current) playerRef.current.currentTime = subs[st.current.cur].start;
        return;
      }
      pause();
    }
  }

  /* ---------- fallback TTS 4s — port shadowing-video.js:110-118 ---------- */
  useEffect(() => {
    const id = setTimeout(() => {
      if (st.current.audio) return; // T7: audio thật có sẵn, không cần TTS fallback
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
    if (st.current.audio) { // T7: audio mode — "Nghe câu" phát clip thật thay vì TTS
      gotoSentence(Math.min(Math.max(i, 0), subs.length - 1), true);
      return;
    }
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

  /* ---------- play / pause / câu ---------- */
  function play() {
    st.current.playing = true; setPlaying(true);
    if (st.current.audio) { audioPlay(); return; }
    if (st.current.tts) speakCurrent();
    else { void playerRef.current?.play(); if (playerRef.current) playerRef.current.playbackRate = st.current.rate; }
  }
  function pause() {
    st.current.playing = false; setPlaying(false);
    if (st.current.audio) { try { audioEl()?.pause(); } catch { /* silent */ } return; }
    if (st.current.tts) { try { ttsCancel(); } catch { /* silent */ } } else playerRef.current?.pause();
  }
  const togglePlay = () => { if (st.current.playing) pause(); else play(); };

  function gotoSentence(i: number, autoplay: boolean) {
    const clamped = Math.min(Math.max(i, 0), subs.length - 1);
    st.current.cur = clamped;
    if (st.current.audio) {
      seekAudio(clamped); // src clip mới do studio render theo cur
      if (autoplay) play();
      setCur(clamped);
      return;
    }
    if (st.current.tts) {
      if (st.current.playing || autoplay) { st.current.playing = true; setPlaying(true); speakCurrent(); }
      else setCur(clamped);
    } else {
      if (playerRef.current) playerRef.current.currentTime = subs[clamped].start;
      if (autoplay && !st.current.playing) play();
    }
    setCur(clamped);
  }
  const next = () => gotoSentence(st.current.cur + 1, st.current.playing);
  const prev = () => gotoSentence(st.current.cur - 1, st.current.playing);
  const repeat = () => gotoSentence(st.current.cur, true);

  const setRatePublic = (r: number) => {
    st.current.rate = r; setRate(r);
    if (st.current.audio) { try { audioEl()!.playbackRate = r; } catch { /* silent */ } return; }
    if (!st.current.tts && playerRef.current) playerRef.current.playbackRate = r;
  };
  const toggleLoop = () => { st.current.loop = !st.current.loop; setLoop(st.current.loop); };
  // Task 5 — toggle auto-pause: mirror ref + React state + localStorage (prefs)
  const setAutoPausePublic = (on: boolean) => {
    st.current.autoPause = on;
    setAutoPauseState(on);
    setAutoPause(on);
  };

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

  /* ---------- nghe lại câu ---------- */
  const listenCurrent = () => {
    if (st.current.audio) { gotoSentence(st.current.cur, true); return; }
    if (tts) speakSentence(cur);
    else {
      if (playerRef.current) playerRef.current.currentTime = subs[cur].start;
      void playerRef.current?.play();
      if (!st.current.playing) play();
    }
  };

  return {
    cur,
    playing,
    tts,
    ytReady,
    playerError,
    rate,
    loop,
    time,
    autoPause,
    setAutoPause: setAutoPausePublic,
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
    markYtReady,
    handlePlayerError,
    syncPlaying,
  };
}
