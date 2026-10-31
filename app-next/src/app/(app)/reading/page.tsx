import type { Metadata } from "next";
import ReadingClient from "./reading-client";

export const metadata: Metadata = {
  title: "Bài đọc",
  description: "Thư viện bài đọc theo level HSK 1–5 — audio, pinyin, dịch và câu hỏi kiểm tra.",
};

export default function ReadingPage() {
  return <ReadingClient />;
}
