/* /pinyin/practice — giữ URL cho link cũ (roadmap, e2e): chuyển thẳng quiz mode. */

import { redirect } from "next/navigation";

export default function PinyinPracticePage() {
  redirect("/pinyin?mode=quiz");
}
