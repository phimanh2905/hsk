/* /hanzi (G2) — Phân tích Hán tự màn 1: search + vẽ + pills cấp độ. Server SSG; tương tác trong HanziHome. */

import type { Metadata } from "next";
import HanziHome from "./hanzi-home";

export const metadata: Metadata = { title: "Phân tích Hán tự" };

export default function HanziPage() {
  return <HanziHome />;
}
