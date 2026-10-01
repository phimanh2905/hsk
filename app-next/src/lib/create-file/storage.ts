/* Port 1:1 từ clone/js/create-file.js — persist/cfLoadAll + gate mã (hasCode) + mock login.
   Giữ hành vi giữ-state-qua-reload: sessionStorage "nhai.cf.state" nguyên trạng, mọi thao tác bọc try/catch. */

import { mergeCfState } from "./defaults";
import type { CfState } from "./types";

export const CF_SESSION_KEY = "nhai.cf.state";

export function loadCfState(): CfState | null {
  try {
    const s = sessionStorage.getItem(CF_SESSION_KEY);
    if (!s) return null;
    const o = JSON.parse(s);
    if (!o || typeof o !== "object") return null;
    return mergeCfState(o, null);
  } catch {
    return null;
  }
}

export function persistCfState(s: CfState): void {
  try {
    sessionStorage.setItem(CF_SESSION_KEY, JSON.stringify(s));
  } catch {
    /* silent */
  }
}

export function hasFileCode(): boolean {
  try {
    return localStorage.getItem("nhai.fileCode") === "1";
  } catch {
    return false;
  }
}

export function setFileCode(): void {
  try {
    localStorage.setItem("nhai.fileCode", "1");
  } catch {
    /* silent */
  }
}

/* chỉ đọc — bên ghi là Login modal của shell */
export function isLoggedInMock(): boolean {
  try {
    return localStorage.getItem("nhai.mockLogin") === "1";
  } catch {
    return false;
  }
}
