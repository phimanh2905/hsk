export type ShadowFont = "sm" | "base" | "lg";
function lsGet(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k: string, v: string): void { try { localStorage.setItem(k, v); } catch { /* silent */ } }
export function getShadowFont(): ShadowFont {
  const f = lsGet("bye.shadow.font");
  return f === "sm" ? "sm" : f === "base" ? "base" : "lg";
}
export function setShadowFont(f: ShadowFont): void { lsSet("bye.shadow.font", f); }
export function getAutoscroll(): boolean { return lsGet("bye.shadow.autoscroll") !== "0"; }
export function setAutoscroll(on: boolean): void { lsSet("bye.shadow.autoscroll", on ? "1" : "0"); }
export function getVoicePref(): "female" | "male" { return lsGet("bye.voice") === "male" ? "male" : "female"; }

/* Chế độ luyện chép chính tả (Task 2) — typing = gõ, arrange = xếp từ. */
export type DictVariant = "typing" | "arrange";
export function getDictVariant(): DictVariant { return lsGet("bye.shadowing.dictVariant") === "arrange" ? "arrange" : "typing"; }
export function setDictVariant(v: DictVariant): void { lsSet("bye.shadowing.dictVariant", v); }
export function getAutoPause(): boolean { return lsGet("bye.shadowing.autoPause") === "1"; }
export function setAutoPause(on: boolean): void { lsSet("bye.shadowing.autoPause", on ? "1" : "0"); }
