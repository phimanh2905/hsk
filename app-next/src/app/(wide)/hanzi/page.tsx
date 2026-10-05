/* /hanzi (G2) — Hanzi Studio: luyện viết & chiết tự (port opendesign_hsk/hanzi.html,
   spec 2026-10-05). Server SSG; tương tác trong HanziStudio. Chi tiết chữ: /hanzi/[char]. */

import type { Metadata } from "next";
import HanziStudio from "./hanzi-studio";

export const metadata: Metadata = { title: "Hanzi Studio" };

export default function HanziPage() {
  return <HanziStudio />;
}
