"use client";

/* AutoplayModal — modal "Tự động phát thẻ", port clone/js/radicals.js:120-191 (SPEC-20 §A).
   Cấu hình: thời gian lật (2/3/5/10s), thời gian sang thẻ mới (1/2/3s),
   toggle "Nghe từ vựng" + số lần nghe lại (disabled khi toggle tắt). */

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type AutoplayCfg = {
  flipSec: 2 | 3 | 5 | 10;
  nextSec: 1 | 2 | 3;
  speakOn: boolean;
  repeat: 1 | 2 | 3;
};

export const DEFAULT_CFG: AutoplayCfg = { flipSec: 3, nextSec: 2, speakOn: false, repeat: 1 };

const selectCls =
  "w-full min-h-11 rounded-control border border-border-default bg-surface-elevated px-3 py-2 text-sm " +
  "text-text-primary disabled:opacity-50 disabled:pointer-events-none " +
  "focus:outline-none focus:ring-3 ring-action-focus ring-offset-2";

export default function AutoplayModal({
  onStart,
  onClose,
}: {
  onStart: (cfg: AutoplayCfg) => void;
  onClose: () => void;
}) {
  const [cfg, setCfg] = useState<AutoplayCfg>(DEFAULT_CFG);

  return (
    <Dialog open onClose={onClose} labelledBy="autoplay-modal-title" className="max-w-sm p-5">
      <h3 id="autoplay-modal-title" className="text-xl font-extrabold">Tự động phát thẻ</h3>
      <p className="text-xs text-text-secondary font-semibold mt-1 mb-4">
        Cấu hình nhịp lật thẻ và phát âm tự động.
      </p>

      <label className="block mb-3">
        <span className="block text-sm font-bold mb-1">Thời gian lật thẻ</span>
        <select
          className={selectCls}
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
          className={selectCls}
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
          className="w-5 h-5 accent-action-primary"
          checked={cfg.speakOn}
          onChange={(e) => setCfg((c) => ({ ...c, speakOn: e.target.checked }))}
        />
      </label>

      <label className="block mb-4">
        <span className="block text-sm font-bold mb-1">Số lần nghe lại</span>
        <select
          className={selectCls}
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
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Huỷ
        </Button>
        <Button type="button" size="sm" onClick={() => onStart(cfg)}>
          Bắt đầu
        </Button>
      </div>
    </Dialog>
  );
}
