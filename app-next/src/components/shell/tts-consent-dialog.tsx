"use client";
/* Dialog hỏi tải model Kokoro lần đầu (spec §6) — mở khi orchestrator phát
   state consent/downloading/error; ẩn ở idle/ready. */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  getTtsOrchestrator,
  type TtsOrchestratorState,
} from "@/lib/tts/engine";

const mb = (n: number) => `${Math.round(n / 1024 / 1024)} MB`;

export default function TtsConsentDialog() {
  const [state, setState] = useState<TtsOrchestratorState>(() =>
    getTtsOrchestrator().getState()
  );

  useEffect(() => getTtsOrchestrator().subscribe(setState), []);

  const open =
    state.kind === "consent" || state.kind === "downloading" || state.kind === "error";

  return (
    <Dialog open={open} onClose={() => {}} labelledBy="tts-consent-title">
      <h2 id="tts-consent-title" className="text-2xl font-extrabold mb-2">
        Giọng đọc Bye HSK
      </h2>
      {state.kind === "downloading" ? (
        <div>
          <p className="text-sm text-text-secondary mb-2">
            Đang tải giọng đọc… {mb(state.received)} / {mb(state.total)}
          </p>
          <progress className="w-full" value={state.received} max={state.total} />
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={() => getTtsOrchestrator().acceptConsent(false)}>
              Bỏ qua, dùng giọng hệ thống
            </Button>
          </div>
        </div>
      ) : state.kind === "error" ? (
        <div>
          <p className="text-sm text-text-secondary mb-4">
            Không tải được giọng đọc: {state.message}. Bạn vẫn nghe được bằng giọng hệ thống.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => getTtsOrchestrator().acceptConsent(false)}>
              Dùng giọng hệ thống
            </Button>
            <Button onClick={() => void getTtsOrchestrator().retryAfterError()}>Thử lại</Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-text-secondary mb-4">
            Nghe tiếng Trung rõ và đều hơn trên mọi thiết bị bằng giọng đọc tích hợp của
            Bye HSK. Cần tải model ~156 MB (máy không hỗ trợ WebGPU: ~127 MB), chỉ tải
            một lần rồi dùng offline.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => getTtsOrchestrator().acceptConsent(false)}>
              Dùng giọng hệ thống
            </Button>
            <Button onClick={() => getTtsOrchestrator().acceptConsent(true)}>
              Tải giọng Bye HSK
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
