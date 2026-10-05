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
