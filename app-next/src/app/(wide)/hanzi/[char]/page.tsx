/* /hanzi/[char] (G2) — chi tiết chữ. SSG cho các chữ có data (generateStaticParams),
   dynamic OK cho chữ khác (dynamicParams mặc định). Next giữ percent-encoding trong params → decode. */

import type { Metadata } from "next";
import { hanziChars } from "@/content/hanzi";
import HanziDetail from "./hanzi-detail";

export function generateStaticParams(): { char: string }[] {
  return Object.keys(hanziChars).map((char) => ({ char }));
}

export async function generateMetadata({ params }: { params: Promise<{ char: string }> }): Promise<Metadata> {
  const { char: raw } = await params;
  const ch = decodeURIComponent(raw);
  const c = hanziChars[ch];
  return { title: ch + " - " + (c?.hanViet ?? "?") };
}

export default async function HanziCharPage({ params }: { params: Promise<{ char: string }> }) {
  const { char: raw } = await params;
  return <HanziDetail char={decodeURIComponent(raw)} />;
}
