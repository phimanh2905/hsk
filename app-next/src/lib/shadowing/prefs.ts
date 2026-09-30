export type ShadowFont = "sm" | "base" | "lg";
function lsGet(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k: string, v: string): void { try { localStorage.setItem(k, v); } catch { /* silent */ } }
export function getShadowFont(): ShadowFont {
  const f = lsGet("nhai.shadow.font");
  return f === "sm" ? "sm" : f === "base" ? "base" : "lg";
}
export function setShadowFont(f: ShadowFont): void { lsSet("nhai.shadow.font", f); }
export function getAutoscroll(): boolean { return lsGet("nhai.shadow.autoscroll") !== "0"; }
export function setAutoscroll(on: boolean): void { lsSet("nhai.shadow.autoscroll", on ? "1" : "0"); }
export function getVoicePref(): "female" | "male" { return lsGet("nhai.voice") === "male" ? "male" : "female"; }
