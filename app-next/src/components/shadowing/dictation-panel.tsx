"use client";
import { useEffect, useState } from "react";
import { normDict, diffNormalized } from "@/lib/shadowing/dictation";
import type { SubtitleSentence } from "@/content/shadowing";

export default function DictationPanel({ sentence, onListen, onSkip }: {
  sentence: SubtitleSentence; onListen: () => void; onSkip: () => void;
}) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<null | { kind: "empty" | "correct" | "wrong"; diff?: { char: string; ok: boolean | null }[] }>(null);
  useEffect(() => { setValue(""); setResult(null); }, [sentence]);
  const full = sentence.parts.map((p) => p.zh).join(" ");

  function check() {
    if (!normDict(value)) { setResult({ kind: "empty" }); return; }
    const want = normDict(full);
    setResult(normDict(value) === want ? { kind: "correct" } : { kind: "wrong", diff: diffNormalized(value, full) });
  }
  return (
    <div className="card shadow-neo p-4 space-y-3" data-testid="dictation">
      <div className="flex gap-2">
        <button type="button" data-testid="dict-listen" onClick={onListen} className="btn-ghost px-3 py-1.5 text-sm">Nghe câu này 🔊</button>
        <button type="button" data-testid="dict-check" onClick={check} className="btn-main px-3 py-1.5 text-sm">Kiểm tra</button>
        <button type="button" data-testid="dict-skip" onClick={onSkip} className="btn-ghost px-3 py-1.5 text-sm ml-auto">Bỏ qua câu này</button>
      </div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") check(); }}
        placeholder="Gõ những gì bạn nghe được (chữ Hán hoặc pinyin)"
        className="w-full border-2 border-nhai-border rounded-lg px-3 py-3 text-lg zh bg-nhai-bg"
        data-testid="dict-input"
      />
      <div data-testid="dict-result">
        {result?.kind === "empty" && <p className="text-nhai-muted">Hãy gõ những gì bạn nghe được trước đã.</p>}
        {result?.kind === "correct" && (
          <><p className="font-bold text-green-700 dark:text-green-400">✅ Chính xác! 🎉</p><p className="zh mt-1">{full}</p></>
        )}
        {result?.kind === "wrong" && (
          <>
            <p className="font-bold text-nhai-main">❌ Chưa đúng — chữ sai được tô đỏ:</p>
            <p className="mt-1 text-lg">{result.diff!.map((d, i) => d.ok === false
              ? <span key={i} className="text-red-600 font-bold underline">{d.char}</span>
              : <span key={i}>{d.char}</span>)}</p>
            <p className="mt-2 text-sm text-nhai-muted">Đáp án: <span className="zh font-semibold text-nhai-ink">{full}</span>
              {sentence.pinyin ? <span className="italic"> ({sentence.pinyin})</span> : null}</p>
          </>
        )}
      </div>
    </div>
  );
}
