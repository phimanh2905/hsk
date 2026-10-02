"use client";

/* Form 7 nhóm "Tạo file" (G7 — SPEC-16 §B). Port formHtml + charRowsInner +
   modalShell/helpModalBody/importModalBody của clone/js/create-file.js:505-587 sang JSX.
   Thuần presentational: nhận { state, dispatch, tplId } từ CreateFileClient. */

import React, { useState } from "react";
import { parseLine } from "@/lib/create-file/defaults";
import type { CfAction, CfState } from "@/lib/create-file/types";
import { useToast } from "@/components/shell/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { X } from "@/components/ui/icon";

/* tpl có nhóm 1 "Từ vựng cần luyện" (clone create-file.js:505) */
const CHARS_TPLS = ["stroke-order", "big-char", "vocab", "vocab-check", "pinyin-write", "paragraph", "lined-paper"];

type ModalKind = null | "help" | "import";

function GroupCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 mb-3">
      <h3 className="font-bold mb-2">{title}</h3>
      {children}
    </Card>
  );
}

function RadioRow({ name, value, label, checked, onChange }: {
  name: string; value: string; label: React.ReactNode; checked: boolean; onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="accent-action-primary" />
      <span>{label}</span>
    </label>
  );
}

function CheckRow({ label, checked, onChange }: { label: React.ReactNode; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-action-primary" />
      <span>{label}</span>
    </label>
  );
}

function Stepper({ label, state, k, min, max, dispatch }: {
  label: string; state: CfState; k: "perRow" | "fillRows" | "blankRows";
  min: number; max: number; dispatch: (a: CfAction) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm font-bold">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        <Button
          type="button"
          data-dir="-1"
          variant="secondary"
          onClick={() => dispatch({ type: "step", key: k, dir: -1, min, max })}
          className="w-8 min-h-8 h-8 p-0"
          aria-label={label + " giảm"}
        >
          −
        </Button>
        <span aria-label={label} className="w-8 text-center font-semibold">{state[k]}</span>
        <Button
          type="button"
          data-dir="1"
          variant="secondary"
          onClick={() => dispatch({ type: "step", key: k, dir: 1, min, max })}
          className="w-8 min-h-8 h-8 p-0"
          aria-label={label + " tăng"}
        >
          +
        </Button>
      </span>
    </div>
  );
}

function Slider({ label, suffix, value, min, max, onChange }: {
  label: string; suffix?: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm font-bold">
      {label} <span className="font-semibold text-action-primary">{value}{suffix || ""}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="mt-1 w-full accent-action-primary"
      />
    </label>
  );
}

function CharRows({ state, dispatch }: { state: CfState; dispatch: (a: CfAction) => void }) {
  return (
    <>
      {state.chars.map((c, i) => (
        <div key={i} className="group flex items-center gap-3 py-1.5 border-b border-border-subtle">
          <span className="zh text-2xl font-bold w-12 text-center shrink-0">{c.hanzi}</span>
          <span className="w-28 shrink-0">
            <span className="block text-sm zh">{c.pinyin}</span>
            <span className="block text-xs font-bold tracking-wide">{(c.hv || "").toUpperCase()}</span>
          </span>
          <Input
            type="text"
            value={c.meaning}
            placeholder="Nghĩa…"
            onChange={(e) => dispatch({ type: "setMeaning", index: i, value: e.target.value })}
            className="flex-1 min-w-0 min-h-9 py-1 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            aria-label={"Xoá " + c.hanzi}
            onClick={() => dispatch({ type: "deleteChar", index: i })}
            className="shrink-0 w-8 min-h-8 h-8 p-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </Button>
        </div>
      ))}
    </>
  );
}

export default function CreateFileForm({ state, dispatch, tplId }: {
  state: CfState; dispatch: (a: CfAction) => void; tplId: string;
}): React.JSX.Element {
  const toast = useToast();
  const [modal, setModal] = useState<ModalKind>(null);
  const [importText, setImportText] = useState("");

  const addFromImport = () => {
    const lines = importText.split("\n").map(parseLine).filter(Boolean);
    /* đếm từ MỚI (không trùng hanzi — khớp reducer addChars) trước khi dispatch */
    const added = lines.filter((l) => l && !state.chars.some((x) => x.hanzi === l.hanzi)).length;
    dispatch({ type: "addChars", chars: lines as never });
    toast(added ? "Đã thêm " + added + " từ." : "Không có từ mới nào được thêm.");
    setModal(null);
    setImportText("");
  };

  return (
    <div className="no-print">
      {CHARS_TPLS.indexOf(tplId) >= 0 && (
        <GroupCard title="Từ vựng cần luyện">
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" variant="secondary" size="sm" onClick={() => setModal("help")}>Hướng dẫn nhập từ vựng</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => { setImportText(""); setModal("import"); }}>Nhập vào danh sách</Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => { dispatch({ type: "formatAiMock" }); toast("Đã format " + state.chars.length + " từ"); }}
            >
              Format bằng AI
            </Button>
          </div>
          <div data-charrows className="mt-3"><CharRows state={state} dispatch={dispatch} /></div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="font-semibold">{state.chars.length} từ sẽ có trong bản in</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { dispatch({ type: "clearChars" }); toast("Đã xoá tất cả từ."); }}
              className="text-feedback-error hover:text-feedback-error"
            >
              Xóa tất cả
            </Button>
          </div>
        </GroupCard>
      )}

      <GroupCard title="Trang">
        <label className="block text-sm font-bold mb-2">
          Tiêu đề
          <Input
            type="text"
            value={state.title}
            onChange={(e) => dispatch({ type: "set", key: "title", value: e.target.value })}
            className="mt-1 w-full font-normal"
          />
        </label>
        <CheckRow
          label="Tiêu đề + Họ tên/Ngày"
          checked={state.nameDate}
          onChange={() => dispatch({ type: "set", key: "nameDate", value: !state.nameDate })}
        />
      </GroupCard>

      <GroupCard title="Loại ô">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {([
            ["dien-tu", "Điền tự"], ["mi", "Mễ tự"], ["vuong", "Ô vuông"],
            ["hoi-cung", "Hồi cung"], ["cuu-cung", "Cửu cung"],
          ] as const).map(([v, label]) => (
            <RadioRow
              key={v}
              name="r-cellType"
              value={v}
              label={label}
              checked={state.cellType === v}
              onChange={() => dispatch({ type: "set", key: "cellType", value: v })}
            />
          ))}
        </div>
      </GroupCard>

      <GroupCard title="Màu ô">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {([
            ["green", "green"], ["red", "red"], ["blue", "blue"], ["gray", "gray"],
          ] as const).map(([v, label]) => (
            <RadioRow
              key={v}
              name="r-cellColor"
              value={v}
              label={label}
              checked={state.cellColor === v}
              onChange={() => dispatch({ type: "set", key: "cellColor", value: v })}
            />
          ))}
        </div>
      </GroupCard>

      <GroupCard title="Bố cục">
        <div className="space-y-1.5">
          <Stepper label="Số ô mỗi hàng" state={state} k="perRow" min={6} max={16} dispatch={dispatch} />
          <Stepper label="Số hàng tô" state={state} k="fillRows" min={0} max={12} dispatch={dispatch} />
          <Stepper label="Số hàng trống" state={state} k="blankRows" min={0} max={12} dispatch={dispatch} />
          <Slider
            label="Số từ mờ"
            suffix="/12"
            value={state.faintCount}
            min={0}
            max={12}
            onChange={(v) => dispatch({ type: "set", key: "faintCount", value: v })}
          />
        </div>
      </GroupCard>

      <GroupCard title="Chữ">
        <div className="text-sm font-bold">Kiểu khung chữ</div>
        <CheckRow label="Khải thư" checked={state.script === "khai"} onChange={() => dispatch({ type: "setScript", value: "khai", checked: state.script !== "khai" })} />
        <CheckRow label="Hành thư" checked={state.script === "hanh"} onChange={() => dispatch({ type: "setScript", value: "hanh", checked: state.script !== "hanh" })} />
        <div className="text-sm font-bold mt-2">Nguồn nét</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <RadioRow
            name="r-strokeSource"
            value="CNstrokeorder"
            label={<span><span className="zh">笔顺</span> CNstrokeorder <span className="zh">永远</span></span>}
            checked={state.strokeSource === "CNstrokeorder"}
            onChange={() => dispatch({ type: "set", key: "strokeSource", value: "CNstrokeorder" })}
          />
          <RadioRow
            name="r-strokeSource"
            value="qingfeng"
            label={<span><span className="zh">清风体</span> <span className="zh">永远</span></span>}
            checked={state.strokeSource === "qingfeng"}
            onChange={() => dispatch({ type: "set", key: "strokeSource", value: "qingfeng" })}
          />
        </div>
        <div className="text-sm font-bold mt-2">Kiểu chữ tô</div>
        {([
          ["faint", "Tô mờ"], ["hollow", "Chữ rỗng"],
          ["dashed-hollow", "Rỗng nét đứt"], ["thin-dashed", "Nét đứt mảnh"],
        ] as const).map(([v, label]) => (
          <CheckRow
            key={v}
            label={label}
            checked={state.traceStyle.indexOf(v) >= 0}
            onChange={() => dispatch({ type: "setTraceStyle", value: v, checked: state.traceStyle.indexOf(v) < 0 })}
          />
        ))}
        <div className="mt-2 space-y-1.5">
          <Slider label="Độ đậm" suffix="%" value={state.opacity} min={0} max={100} onChange={(v) => dispatch({ type: "set", key: "opacity", value: v })} />
          <Slider label="Cỡ chữ" suffix="%" value={state.fontSize} min={50} max={120} onChange={(v) => dispatch({ type: "set", key: "fontSize", value: v })} />
        </div>
      </GroupCard>

      <GroupCard title="Hiển thị">
        <CheckRow label="Pinyin" checked={state.showPinyin} onChange={() => dispatch({ type: "set", key: "showPinyin", value: !state.showPinyin })} />
        <CheckRow label="Nghĩa" checked={state.showMeaning} onChange={() => dispatch({ type: "set", key: "showMeaning", value: !state.showMeaning })} />
      </GroupCard>

      <div className="no-print flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { dispatch({ type: "reset", tpl: tplId }); toast("Đã khôi phục mặc định."); }}
        >
          Khôi phục mặc định
        </Button>
        <p className="text-xs text-text-secondary text-right">Bấm In rồi chọn “Lưu dưới dạng PDF” trong hộp thoại của trình duyệt.</p>
      </div>

      {/* modal chung 1 cái (port modalShell — clone create-file.js:530-536) */}
      <Dialog open={modal !== null} onClose={() => setModal(null)} labelledBy="cf-modal-title" className="max-h-[80vh] overflow-y-auto no-print">
        <div className="flex items-center justify-between mb-3">
          <h3 id="cf-modal-title" className="font-bold">{modal === "help" ? "Hướng dẫn nhập từ vựng" : "Nhập vào danh sách"}</h3>
          <Button type="button" variant="ghost" onClick={() => setModal(null)} aria-label="Đóng" className="w-9 min-h-9 h-9 p-0">
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </Button>
        </div>
        {modal === "help" ? (
          <div className="text-sm space-y-2">
            <p>Mỗi dòng 1 từ, theo dạng: <code className="font-bold">hanzi pinyin nghĩa</code></p>
            <p>Ví dụ:</p>
            <pre className="bg-surface-paper border border-border-default rounded-control p-2 zh">{"学习 xué xí học tập\n朋友 péng yǒu bạn bè"}</pre>
            <p>Sau khi thêm, bạn vẫn sửa được pinyin / nghĩa ngay trong danh sách.</p>
            <Button type="button" onClick={() => setModal(null)} size="sm" className="mt-3">Đã hiểu</Button>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-bold">
              Danh sách từ (mỗi dòng: hanzi pinyin nghĩa)
              <Textarea
                rows={6}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="mt-1 w-full zh font-normal"
                placeholder="学习 xué xí học tập"
              />
            </label>
            <div className="flex justify-end gap-2 mt-3">
              <Button type="button" variant="secondary" size="sm" onClick={() => setModal(null)}>Huỷ</Button>
              <Button type="button" size="sm" onClick={addFromImport}>Thêm vào danh sách</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
