"use client";

/* ReadingReaderRoot — root client của /reading/[id] (redesign 2026-10-05, port
   view Reader của opendesign_hsk/reading.html). Topbar row của app (back + A-/A+
   + title) KHÔNG đụng shell topbar. Persist scaf/font qua localStorage keys
   "bye.reading.scaf"/"bye.reading.font" (đọc 1 lần sau mount — hydration-safe).
   XP quiz: recordReadingQuizDone chỉ lần đầu → +3 XP. Progress: maxIndex câu sâu
   nhất đã chạm → recordReadingProgress khi pause / quiz done / unmount. */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Minus, Plus } from "lucide-react";

import { READING_LIB, type ReadingArticle, type ReadingWord } from "@/content/reading";
import { estimateDuration } from "@/lib/reading/karaoke";
import { useReaderAudio } from "@/lib/reading/use-reader-audio";
import { progressStore } from "@/lib/store/progress-store";
import { useToastSafe } from "@/components/shell/toast-provider";
import { IconButton } from "@/components/ui/icon-button";
import { ScaffoldBar, type ScaffoldMode } from "@/components/reading/scaffold-bar";
import { PassageView } from "@/components/reading/passage-view";
import { WordPopup } from "@/components/reading/word-popup";
import { ReadingQuiz } from "@/components/reading/reading-quiz";
import { AudioBar } from "@/components/reading/audio-bar";

const SCAF_KEY = "bye.reading.scaf";
const FONT_KEY = "bye.reading.font";
const RATES = [0.75, 1, 1.25] as const;
const FONT_MIN = 16;
const FONT_MAX = 26;
const FONT_STEP = 2;

function readLocal<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — bỏ qua */
  }
}

export default function ReadingReaderRoot({ article }: { article: ReadingArticle }) {
  const item = READING_LIB.find((i) => i.id === article.id);
  const total = article.sentences.length;
  const toast = useToastSafe();

  const [scaf, setScaf] = useState<ScaffoldMode>("hanzi");
  const [follow, setFollow] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [popWord, setPopWord] = useState<{ word: ReadingWord; rect: DOMRect } | null>(null);
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [quizDone, setQuizDone] = useState(false);

  // maxIndex qua ref (không cần re-render; progress chỉ ghi ở settle).
  const maxIndexRef = useRef(0);
  const touchedRef = useRef(false); // đã chạm ≥1 câu thì mới ghi progress
  const quizDoneRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const audio = useReaderAudio(article.sentences);

  /* ---- persist sau mount (hydration-safe) ---- */
  useEffect(() => {
    const savedScaf = readLocal<string>(SCAF_KEY);
    if (savedScaf === "hanzi" || savedScaf === "pinyin" || savedScaf === "hanviet") {
      setScaf(savedScaf);
    }
    const savedFont = readLocal<number>(FONT_KEY);
    if (typeof savedFont === "number" && savedFont >= FONT_MIN && savedFont <= FONT_MAX) {
      setFontSize(savedFont);
    }
    const prog = progressStore.getReadingProgress(article.id);
    if (prog) {
      setQuizDone(prog.quizDone);
      quizDoneRef.current = prog.quizDone;
      // maxIndex suy từ pct, clamp [0, total]
      maxIndexRef.current = Math.min(total, Math.max(0, Math.round((prog.pct / 100) * total)));
      if (maxIndexRef.current > 0) touchedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);

  /* ---- theo dõi tiến độ: maxIndex = max(maxIndex, index) ---- */
  useEffect(() => {
    if (audio.index > maxIndexRef.current) maxIndexRef.current = audio.index;
    if (audio.playing) touchedRef.current = true;
  }, [audio.playing, audio.index]);

  const settle = useCallback(() => {
    if (!touchedRef.current) return;
    progressStore.recordReadingProgress(
      article.id,
      Math.min(
        100,
        Math.round(((maxIndexRef.current + 1) / Math.max(1, total)) * 100),
      ),
    );
  }, [article.id, total]);

  // Ghi lần cuối khi unmount.
  useEffect(() => {
    return () => settle();
  }, [settle]);

  /* ---- follow: cuộn câu đang phát vào giữa màn ---- */
  useEffect(() => {
    if (!follow || !audio.playing) return;
    rootRef.current
      ?.querySelector(".sent.playing")
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [follow, audio.playing, audio.index]);

  /* ---- wiring topbar A-/A+ ---- */
  const changeFont = useCallback(
    (delta: number) => {
      const next = Math.min(FONT_MAX, Math.max(FONT_MIN, fontSize + delta * FONT_STEP));
      if (next !== fontSize) {
        setFontSize(next);
        writeLocal(FONT_KEY, next);
        toast?.(`Cỡ chữ: ${next}px`);
      }
    },
    [fontSize, toast],
  );

  const changeScaf = useCallback((m: ScaffoldMode) => {
    setScaf(m);
    writeLocal(SCAF_KEY, m);
  }, []);

  /* ---- audio bar ---- */
  const onPlayPause = useCallback(() => {
    if (audio.playing) {
      settle(); // pause → ghi progress
      audio.pause();
    } else {
      audio.play();
    }
  }, [audio, settle]);

  const onSeek = useCallback(
    (i: number) => {
      audio.seek(i);
      audio.play(i);
    },
    [audio],
  );

  const onReplay = useCallback(() => {
    if (audio.index > 0) {
      audio.seek(audio.index - 1);
      audio.play(audio.index - 1);
    } else {
      audio.play(0);
    }
  }, [audio]);

  const onRate = useCallback(() => {
    const next = RATES[(RATES.indexOf(audio.rate as (typeof RATES)[number]) + 1) % RATES.length];
    audio.setRate(next);
  }, [audio]);

  /* ---- quiz ---- */
  const onAnswer = useCallback(
    (qi: number, oi: number) => {
      const next = { ...answers, [qi]: oi };
      setAnswers(next);
      const allRight = article.quiz.every((q, i) => next[i] === q.answer);
      if (allRight && !quizDoneRef.current) {
        quizDoneRef.current = true;
        setQuizDone(true);
        const first = progressStore.recordReadingQuizDone(article.id);
        if (first) {
          progressStore.addXp(3);
          toast?.("+3 XP · Hoàn thành quiz");
        }
        settle(); // settle lần cuối cùng quiz done
      }
    },
    [answers, article.id, article.quiz, settle, toast],
  );

  /* ---- popup từ ---- */
  const savedWord = popWord
    ? progressStore.getVocabBook().some((v) => v.hanzi === popWord.word.z)
    : false;

  const onSpeakWord = useCallback((word: ReadingWord) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word.z);
    u.lang = "zh-CN";
    window.speechSynthesis.speak(u);
  }, []);

  const onSaveWord = useCallback(
    (word: ReadingWord) => {
      // addToVocabBook trả false khi trùng — đều toast "Đã lưu từ" theo spec.
      progressStore.addToVocabBook({ hanzi: word.z, pinyin: word.p, vi: word.m });
      toast?.(`Đã lưu từ: ${word.z}`);
    },
    [toast],
  );

  return (
    <div
      ref={rootRef}
      data-od-id="reader-root"
      className="mx-auto flex w-full max-w-[780px] flex-col gap-5 p-4 pb-28 md:p-6"
    >
      {/* Topbar row của app: back + A-/A+ + title */}
      <div className="flex items-center gap-3">
        <Link href="/reading" aria-label="Quay lại thư viện">
          <IconButton label="Quay lại thư viện">
            <ArrowLeft size={18} strokeWidth={1.5} />
          </IconButton>
        </Link>
        <div className="flex items-center gap-1">
          <IconButton label="Giảm cỡ chữ" onClick={() => changeFont(-1)}>
            <Minus size={16} strokeWidth={1.5} />
          </IconButton>
          <IconButton label="Tăng cỡ chữ" onClick={() => changeFont(1)}>
            <Plus size={16} strokeWidth={1.5} />
          </IconButton>
        </div>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[15px] font-bold text-text-primary zh">{item?.title ?? article.id}</p>
          {item && <p className="truncate text-[12.5px] text-text-secondary">{item.vi}</p>}
        </div>
        {/* spacer cân giữa với nút back */}
        <div className="w-[76px]" aria-hidden="true" />
      </div>

      <ScaffoldBar scaf={scaf} onScaf={changeScaf} follow={follow} onFollow={setFollow} />

      <PassageView
        article={article}
        scaf={scaf}
        fontSize={fontSize}
        playingIndex={audio.playing ? audio.index : null}
        onWordClick={(word, rect) => setPopWord({ word, rect })}
      />

      {quizDone && (
        <p className="text-[12.5px] font-semibold text-jade" data-od-id="quiz-done-note">
          Bạn đã hoàn thành quiz bài này.
        </p>
      )}

      <ReadingQuiz quiz={article.quiz} answers={answers} onAnswer={onAnswer} />

      {popWord && (
        <WordPopup
          word={popWord.word}
          anchorRect={popWord.rect}
          onClose={() => setPopWord(null)}
          onSpeak={onSpeakWord}
          onSave={onSaveWord}
          saved={savedWord}
        />
      )}

      <AudioBar
        playing={audio.playing}
        index={audio.index}
        total={total}
        rate={audio.rate}
        onPlayPause={onPlayPause}
        onSeek={onSeek}
        onRate={onRate}
        onReplay={onReplay}
        durationSec={estimateDuration(article.sentences, audio.rate)}
      />
    </div>
  );
}
