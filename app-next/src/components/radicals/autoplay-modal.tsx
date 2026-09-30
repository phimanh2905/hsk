"use client";

/* AutoplayModal — modal "Tự động phát thẻ", port clone/js/radicals.js:120-191 (SPEC-20 §A).
   Cấu hình: thời gian lật (2/3/5/10s), thời gian sang thẻ mới (1/2/3s),
   toggle "Nghe từ vựng" + số lần nghe lại (disabled khi toggle tắt). */

import { useState } from "react";

export type AutoplayCfg = {
  flipSec: 2 | 3 | 5 | 10;
  nextSec: 1 | 2 | 3;
  speakOn: boolean;
  repeat: 1 | 2 | 3;
};

export const DEFAULT_CFG: AutoplayCfg = { flipSec: 3, nextSec: 2, speakOn: false, repeat: 1 };

export default function AutoplayModal({
  onStart,
  onClose,
}: {
  onStart: (cfg: AutoplayCfg) => void;
  onClose: () => void;
}) {
  const [cfg, setCfg] = useState<AutoplayCfg>(DEFAULT_CFG);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.45)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card shadow-neo w-full max-w-sm p-5" role="dialog" aria-label="Tự động phát thẻ">
        <h3 className="text-xl font-extrabold">Tự động phát thẻ</h3>
        <p className="text-xs text-nhai-muted font-semibold mt-1 mb-4">
          Cấu hình nhịp lật thẻ và phát âm tự động.
        </p>

        <label className="block mb-3">
          <span className="block text-sm font-bold mb-1">Thời gian lật thẻ</span>
          <select
            className="w-full card px-3 py-2 text-sm bg-transparent"
            value={cfg.flipSec}
            onChange={(e) => setCfg((c) => ({ ...c, flipSec: Number(e.target.value) as AutoplayCfg["flipSec"] }))}
          >
            <option value="2">2 giây</option>
            <option value="3">3 giây</option>
            <option value="5">5 giây</option>
            <option value="10">10 giây</option>
          </select>
        </label>

        <label className="block mb-3">
          <span className="block text-sm font-bold mb-1">Thời gian sang thẻ mới</span>
          <select
            className="w-full card px-3 py-2 text-sm bg-transparent"
            value={cfg.nextSec}
            onChange={(e) => setCfg((c) => ({ ...c, nextSec: Number(e.target.value) as AutoplayCfg["nextSec"] }))}
          >
            <option value="1">1 giây</option>
            <option value="2">2 giây</option>
            <option value="3">3 giây</option>
          </select>
        </label>

        <label className="flex items-center justify-between mb-3 cursor-pointer">
          <span className="text-sm font-bold">Nghe từ vựng</span>
          <input
            type="checkbox"
            className="w-5 h-5 accent-[var(--nhai-main)]"
            checked={cfg.speakOn}
            onChange={(e) => setCfg((c) => ({ ...c, speakOn: e.target.checked }))}
          />
        </label>

        <label className="block mb-4">
          <span className="block text-sm font-bold mb-1">Số lần nghe lại</span>
          <select
            className="w-full card px-3 py-2 text-sm bg-transparent"
            value={cfg.repeat}
            disabled={!cfg.speakOn}
            onChange={(e) => setCfg((c) => ({ ...c, repeat: Number(e.target.value) as AutoplayCfg["repeat"] }))}
          >
            <option value="1">1 lần</option>
            <option value="2">2 lần</option>
            <option value="3">3 lần</option>
          </select>
        </label>

        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={onClose}>
            Huỷ
          </button>
          <button type="button" className="btn-main px-4 py-2 text-sm" onClick={() => onStart(cfg)}>
            Bất đầu
          </button>
        </div>
      </div>
    </div>
  );
}
