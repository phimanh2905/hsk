"use client";
import { useEffect, useState } from "react";
import { normDict, diffNormalized } from "@/lib/shadowing/dictation";
import type { SubtitleSentence } from "@/content/shadowing";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CircleCheck, CircleX, Volume2, ICON_STROKE } from "@/components/ui/icon";

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
    <Card className="p-4 space-y-3" data-testid="dictation">
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" data-testid="dict-listen" onClick={onListen}>
          <Volume2 size={16} strokeWidth={ICON_STROKE} aria-hidden="true" /> Nghe câu này
        </Button>
        <Button size="sm" data-testid="dict-check" onClick={check}>Kiểm tra</Button>
        <Button variant="ghost" size="sm" data-testid="dict-skip" onClick={onSkip} className="ml-auto">Bỏ qua câu này</Button>
      </div>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") check(); }}
        placeholder="Gõ những gì bạn nghe được (chữ Hán hoặc pinyin)"
        className="w-full px-3 py-3 text-lg zh"
        data-testid="dict-input"
      />
      <div data-testid="dict-result">
        {result?.kind === "empty" && <p className="text-text-secondary">Hãy gõ những gì bạn nghe được trước đã.</p>}
        {result?.kind === "correct" && (
          <><p className="font-bold text-feedback-success inline-flex items-center gap-1.5">
            <CircleCheck size={18} strokeWidth={ICON_STROKE} aria-hidden="true" /> Chính xác!
          </p><p className="zh mt-1">{full}</p></>
        )}
        {result?.kind === "wrong" && (
          <>
            <p className="font-bold text-feedback-error inline-flex items-center gap-1.5">
              <CircleX size={18} strokeWidth={ICON_STROKE} aria-hidden="true" /> Chưa đúng — chữ sai được tô đỏ:
            </p>
            <p className="mt-1 text-lg">{result.diff!.map((d, i) => d.ok === false
              ? <span key={i} className="text-feedback-error font-bold underline">{d.char}</span>
              : <span key={i}>{d.char}</span>)}</p>
            <p className="mt-2 text-sm text-text-secondary">Đáp án: <span className="zh font-semibold text-text-primary">{full}</span>
              {sentence.pinyin ? <span className="italic"> ({sentence.pinyin})</span> : null}</p>
          </>
        )}
      </div>
    </Card>
  );
}
