import { stripTones } from "@/lib/pinyin-utils";

const STRIP_RE = /[\s,.!?，。！？、：;；:'"“”’‘·()（）\-—…]/g;
export function normDict(s: string): string {
  return stripTones(s).replace(STRIP_RE, "");
}
