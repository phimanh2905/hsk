"use client";
/* Nhai HSK — VideoPlayer Shadowing (port clone/js/shadowing-video.js).
   Engine imperative duy nhất: điều khiển iframe YouTube qua postMessage
   (handshake "listening", polling 500ms), fallback TTS sau 4s nếu iframe
   không sẵn sàng. Playback state giữ trong useRef, chỉ slice hiển thị
   vào React state. */
import { useEffect, useRef, useState } from "react";
import { useTts } from "@/lib/tts/use-tts";
import { useToast } from "@/components/shell/toast-provider";
import DictationPanel from "@/components/shadowing/dictation-panel";
import RecorderPanel from "@/components/shadowing/recorder-panel";
import { getShadowFont, setShadowFont, getAutoscroll, setAutoscroll, getVoicePref, type ShadowFont } from "@/lib/shadowing/prefs";
import type { ShadowingVideo, SubtitleSentence } from "@/content/shadowing";

const YT_ORIGIN = "https://www.youtube-nocookie.com";

/* Port tick của clone: chọn câu theo thời gian (t ngoài range → câu cuối nếu
   t ≥ end cuối, ngược lại câu 0). Pure — export riêng để unit test. */
export function findSentenceIndex(subs: SubtitleSentence[], t: number): number {
  for (let i = 0; i < subs.length; i++) if (t >= subs[i].start && t < subs[i].end) return i;
  return t >= subs[subs.length - 1].end ? subs.length - 1 : 0;
}

type Props = {
  video: ShadowingVideo;
  subtitles: SubtitleSentence[];
  /** props phụ test — prod undefined */
  postSink?: (msg: string) => void;
};

export default function VideoPlayer({ video, subtitles: subs, postSink }: Props) {
  const { speak, cancel: ttsCancel } = useTts();
  const toast = useToast();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const voicePref = useRef(getVoicePref());

  // stateRef = mirror của clone state — KHÔNG đưa playback vào React state
  const st = useRef({
    mode: "shadow" as "shadow" | "dictation",
    cur: 0,
    playing: false,
    rate: 1,
    tts: false,
    ytReady: false,
    lastTime: 0,
    autoScroll: true,
    transcriptHidden: false,
  });

  // slice hiển thị
  const [cur, setCur] = useState(0);
  const [mode, setMode] = useState<"shadow" | "dictation">("shadow");
  const [ytReady, setYtReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [tts, setTts] = useState(false);
  const [showPy, setShowPy] = useState(false);
  const [showVi, setShowVi] = useState(false);
  const [transcriptHidden, setTranscriptHidden] = useState(false);
  const [rate, setRate] = useState(1);
  const [videoHidden, setVideoHidden] = useState(false);
  const [font, setFont] = useState<ShadowFont>("lg");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const sinkRef = useRef(postSink);
  sinkRef.current = postSink;

  /* ---------- điều khiển YouTube (postMessage) — port shadowing-video.js:52-56 ---------- */
  function ytSend(obj: Record<string, unknown>) {
    sinkRef.current?.(JSON.stringify(obj));
    if (st.current.tts || !iframeRef.current?.contentWindow) return;
    try { iframeRef.current.contentWindow.postMessage(JSON.stringify(obj), YT_ORIGIN); } catch { /* silent */ }
  }
  function ytCmd(func: string, args: unknown[] = []) { ytSend({ event: "command", func, args }); }

  /* ---------- handshake + listener message — port shadowing-video.js:58-84 ---------- */
  useEffect(() => {
    st.current.autoScroll = getAutoscroll();
    setFont(getShadowFont());
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

  function onIframeLoad() {
    // bắt tay API widget: YouTube sẽ đẩy infoDelivery (currentTime, playerState)
    ytSend({ event: "listening", id: "nhai-yt", channel: "widget" });
  }

  /* ---------- polling 500ms — port shadowing-video.js:87-107 ---------- */
  useEffect(() => {
    const id = setInterval(() => {
      if (st.current.tts || !st.current.ytReady) return;
      ytCmd("getCurrentTime");
      tick(st.current.lastTime);
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs]);

  function tick(t: number) {
    const idx = findSentenceIndex(subs, t);
    if (idx !== st.current.cur) { st.current.cur = idx; setCur(idx); return; }
    // tự ngắt câu: dừng ở cuối câu đang phát
    const autoSplit = (document.getElementById("auto-split") as HTMLInputElement | null)?.checked;
    if (st.current.playing && autoSplit && t >= subs[st.current.cur].end - 0.15) pause();
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
      // hết câu → sang câu tiếp theo (chế độ TTS phát liên tục)
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

  /* ---------- phím tắt — port shadowing-video.js:301-309 ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ((t.matches && t.matches("input, textarea, select")) || t.isContentEditable)) return;
      if (shortcutsOpen || settingsOpen) return; // dialog mở → bỏ qua phím tắt
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "r" || e.key === "R") { repeat(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcutsOpen, settingsOpen]);

  /* ---------- autoscroll câu active — port renderActive ---------- */
  useEffect(() => {
    if (st.current.autoScroll && !st.current.transcriptHidden) {
      const el = transcriptRef.current?.querySelector(`[data-sent="${cur}"]`);
      try { el?.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch { /* jsdom */ }
    }
  }, [cur]);

  const fontClass = font === "sm" ? "text-sm" : font === "base" ? "text-base" : "text-lg";

  /* ---------- nghe lại câu cho DictationPanel — port shadowing-video.js ---------- */
  const listenCurrent = () => {
    if (tts) speakSentence(cur);
    else { ytCmd("seekTo", [subs[cur].start, true]); ytCmd("playVideo"); }
  };

  return (
    <div>
      {/* ---------- toolbar ---------- */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button type="button" data-mode="shadow" onClick={() => { st.current.mode = "shadow"; setMode("shadow"); }}
          className={"py-2 text-sm " + (mode === "shadow" ? "btn-main" : "btn-ghost")}>
          Bắt chước phát âm
        </button>
        <button type="button" data-mode="dictation" onClick={() => { st.current.mode = "dictation"; setMode("dictation"); }}
          className={"py-2 text-sm " + (mode === "dictation" ? "btn-main" : "btn-ghost")}>
          Nghe - Viết chính tả
        </button>
        <button type="button" className="btn-ghost py-2 text-sm" onClick={() => setVideoHidden(!videoHidden)}>
          {videoHidden ? "👁 Hiện video" : "👁 Ẩn video"}
        </button>
        <button type="button" className="btn-ghost py-2 text-sm" onClick={() => setShortcutsOpen(true)}>⌨️ Phím tắt</button>
        <button type="button" className="btn-ghost py-2 text-sm" onClick={() => setSettingsOpen(true)}>⚙️ Cài đặt</button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button type="button" className="btn-ghost w-10 h-10" onClick={prev} aria-label="Câu trước">⏮</button>
        <button type="button" className="btn-ghost w-10 h-10" onClick={repeat} aria-label="Lặp lại câu">🔁</button>
        <button type="button" className="btn-main w-12 h-12 text-lg" onClick={togglePlay} aria-label="Phát / tạm dừng" data-play>
          {playing ? "⏸" : "▶"}
        </button>
        <button type="button" className="btn-ghost h-10 px-3 text-sm" onClick={next}>⏭ Câu sau</button>
        <button type="button" className="btn-ghost h-10 px-3 text-sm" onClick={prev}>⏮ Câu trước</button>
        <p data-testid="pos" className="pill text-xs font-bold">Câu {cur + 1}/{subs.length}</p>
      </div>

      {/* ---------- player ---------- */}
      <div data-video-wrap className={"relative mb-4 " + (videoHidden ? "hidden" : "")}>
        <iframe
          ref={iframeRef}
          id="ytplayer"
          title={"YouTube video player — " + video.title}
          src={YT_ORIGIN + "/embed/" + video.id + "?enablejsapi=1&rel=0&playsinline=1"}
          onLoad={onIframeLoad}
          className="w-full aspect-video rounded-xl border-2 border-nhai-border bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <div
          data-testid="video-overlay"
          className={"absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/80 text-white text-center p-4" + (ytReady ? " hidden" : "")}
        >
          <p className="font-bold">Video YouTube — cần kết nối mạng</p>
          {tts && <p className="text-sm text-nhai-accent">Dùng TTS đọc câu — không cần mạng cũng học được.</p>}
        </div>
      </div>
      {tts && (
        <p data-tts-banner className="card p-3 mb-4 text-sm text-nhai-accent font-semibold">
          ⚠️ Không tải được video YouTube — dùng TTS đọc câu. Bấm ▶ để phát, bấm từng câu để nghe.
        </p>
      )}

      {/* ---------- khu dictation / record — panel Task 6 cắm vào slot ---------- */}
      <div data-dictation className={mode === "dictation" ? "" : "hidden"}>
        {mode === "dictation" && <DictationPanel sentence={subs[cur]} onListen={listenCurrent} onSkip={next} />}
      </div>
      <div data-record className={mode !== "dictation" ? "" : "hidden"}>
        {mode !== "dictation" && <RecorderPanel />}
      </div>

      {/* ---------- transcript ---------- */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <label className="flex items-center gap-1 text-sm cursor-pointer">
          <input type="checkbox" checked={showVi} onChange={(e) => setShowVi(e.target.checked)} data-show-vi /> Bản dịch
        </label>
        <label className="flex items-center gap-1 text-sm cursor-pointer">
          <input type="checkbox" checked={showPy} onChange={(e) => setShowPy(e.target.checked)} data-show-py /> Pinyin
        </label>
        <label className="flex items-center gap-1 text-sm cursor-pointer">
          <input type="checkbox" id="auto-split" defaultChecked /> Tự ngắt câu
        </label>
        <label className="flex items-center gap-1 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={!transcriptHidden}
            onChange={(e) => { st.current.transcriptHidden = !e.target.checked; setTranscriptHidden(!e.target.checked); }}
          /> Bản chép
        </label>
        <label className="flex items-center gap-1 text-sm">
          Tốc độ
          <select
            data-rate
            className="card py-1 px-2 text-sm"
            value={rate}
            onChange={(e) => {
              const r = parseFloat(e.target.value) || 1;
              st.current.rate = r; setRate(r);
              if (!st.current.tts) ytCmd("setPlaybackRate", [r]);
            }}
          >
            {[0.5, 0.8, 1, 1.5, 2].map((r) => <option key={r} value={r}>{r}×</option>)}
          </select>
        </label>
      </div>

      <div ref={transcriptRef} data-sentences className={"space-y-2 " + fontClass + (transcriptHidden ? " hidden" : "")}>
        {subs.map((s, i) => (
          <div
            key={i}
            data-sent={i}
            onClick={() => gotoSentence(i, true)}
            className={"card p-3 cursor-pointer border-2 border-transparent hover:border-nhai-border" + (i === cur ? " sent-active" : "")}
          >
            <div className="flex items-start gap-2">
              <span className="text-xs font-bold text-nhai-muted mt-1 shrink-0">#{s.n}</span>
              <div className="flex-1 min-w-0">
                <div className="zh font-semibold" data-zh>
                  {s.parts.map((p, pi) => (
                    <span key={pi} data-part={pi} className="cursor-pointer hover:text-nhai-main">{p.zh}</span>
                  ))}
                </div>
                {s.pinyin && <p data-py className={(showPy ? "" : "hidden ") + "text-sm italic text-nhai-accent mt-1"}>{s.pinyin}</p>}
                {s.vi && <p data-vi className={(showVi ? "" : "hidden ") + "text-sm text-nhai-muted mt-1"}>{s.vi}</p>}
                <button
                  type="button"
                  data-report
                  className="mt-1 text-[11px] text-nhai-muted underline hover:text-nhai-main"
                  onClick={(e) => { e.stopPropagation(); toast("Đã gửi báo lỗi — cảm ơn bạn!"); }}
                >
                  ⚠ Báo lỗi
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- dialog Phím tắt ---------- */}
      {shortcutsOpen && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShortcutsOpen(false); }}>
          <div className="card shadow-neo w-full max-w-sm p-6" role="dialog" aria-label="Phím tắt">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-extrabold">⌨️ Phím tắt</h2>
              <button type="button" className="btn-ghost w-9 h-9" onClick={() => setShortcutsOpen(false)}>✕</button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span>Phát / tạm dừng</span><span className="pill text-xs font-bold">Space</span></div>
              <div className="flex items-center justify-between"><span>Câu trước</span><span className="pill text-xs font-bold">←</span></div>
              <div className="flex items-center justify-between"><span>Câu sau</span><span className="pill text-xs font-bold">→</span></div>
              <div className="flex items-center justify-between"><span>Lặp lại câu</span><span className="pill text-xs font-bold">R</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- dialog Cài đặt — port shadowing-video.js:334-375 ---------- */}
      {settingsOpen && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}>
          <div className="card shadow-neo w-full max-w-sm p-6" role="dialog" aria-label="Cài đặt bản chép">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-extrabold">⚙️ Cài đặt</h2>
              <button type="button" className="btn-ghost w-9 h-9" onClick={() => setSettingsOpen(false)}>✕</button>
            </div>
            <p className="text-sm font-bold mb-2">Cỡ chữ bản chép</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(["sm", "base", "lg"] as ShadowFont[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  data-font={f}
                  className={(font === f ? "btn-main" : "btn-ghost") + " py-2 text-sm"}
                  onClick={() => { setShadowFont(f); setFont(f); }}
                >
                  {f === "sm" ? "Nhỏ" : f === "base" ? "Vừa" : "Lớn"}
                </button>
              ))}
            </div>
            <label className="flex items-center justify-between card p-3 cursor-pointer">
              <span className="text-sm font-semibold">Tự cuộn đến câu đang phát</span>
              <input
                type="checkbox"
                data-autoscroll
                defaultChecked={st.current.autoScroll}
                onChange={(e) => { st.current.autoScroll = e.target.checked; setAutoscroll(e.target.checked); }}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
