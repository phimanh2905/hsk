"use client";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

type Rec = { stop: () => void; onstop: (() => void) | null; ondataavailable: ((e: { data: Blob }) => void) | null; start: () => void; mimeType: string };

export default function RecorderPanel() {
  const [recording, setRecording] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const recRef = useRef<Rec | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const urlsRef = useRef<string[]>([]);
  const chunksRef = useRef<Blob[]>([]);

  // CLEANUP BẮT BUỘC: unmount phải stop rec + stop tracks + revoke mọi blob URL
  useEffect(() => () => {
    try { recRef.current?.stop(); } catch { /* silent */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  function toggle() {
    const nav = navigator as Navigator & { mediaDevices?: MediaDevices };
    const MR = (window as unknown as { MediaRecorder?: new (s: MediaStream) => Rec }).MediaRecorder;
    if (!recording) {
      if (!nav.mediaDevices || !MR) return; // fail im lặng như clone
      nav.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        chunksRef.current = [];
        const rec = new MR(stream);
        rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const url = URL.createObjectURL(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
          urlsRef.current.push(url);
          setItems((prev) => [...prev, url]);
        };
        rec.start();
        recRef.current = rec; streamRef.current = stream;
        setRecording(true);
      }).catch(() => { /* từ chối quyền — im lặng */ });
    } else {
      try { recRef.current?.stop(); } catch { /* silent */ }
      recRef.current = null; streamRef.current = null;
      setRecording(false);
    }
  }
  return (
    <Card className="p-4 space-y-3" data-testid="recorder">
      <Button
        variant="danger"
        size="sm"
        data-testid="rec-btn"
        onClick={toggle}
        style={recording ? { background: "var(--hz-ink)" } : undefined}
      >
        {recording ? "■ Dừng ghi âm" : "● Bắt đầu ghi âm"}
      </Button>
      <p className="text-sm text-text-secondary" data-testid="rec-hint">
        {recording ? "Đang ghi âm… bấm để dừng." : "Ghi âm để so sánh phát âm của bạn với video."}
      </p>
      <div data-testid="rec-list" className="space-y-2">
        {items.map((url, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <Chip className="min-h-6 px-2 text-xs font-bold">Bản ghi</Chip>
            <audio controls src={url} className="h-9 flex-1 max-w-xs" />
          </div>
        ))}
      </div>
    </Card>
  );
}
