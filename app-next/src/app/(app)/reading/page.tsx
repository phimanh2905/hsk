import type { Metadata } from "next";
import ReadingClient from "./reading-client";

export const metadata: Metadata = {
  title: "Bài đọc",
  description: "Dán đoạn văn tiếng Trung — đọc theo karaoke TTS, highlight theo từng ký tự.",
};

export default function ReadingPage() {
  return <ReadingClient />;
}
