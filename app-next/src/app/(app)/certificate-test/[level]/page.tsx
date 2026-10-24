import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVocab } from "@/lib/content/vocab";
import { generateExam } from "@/lib/exam/generate";
import ExamRunner from "./exam-runner";

/* W6.3 — /certificate-test/[level]: đề thi demo. Hiện chỉ HSK1 (từ vocab demo
   HSK1 — gộp tất cả pages của book), level khác → notFound. */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ level: string }>;
}): Promise<Metadata> {
  const { level } = await params;
  return {
    title: `Đề thi demo ${level} | Bye HSK`,
    description: `Làm bài thi demo ${level} — nghe, đọc, viết`,
  };
}

export default async function CertificateExamPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level } = await params;
  if (level !== "hsk1") notFound();

  const data = await getVocab();
  const words = Object.values(data["hsk1"] ?? {}).flatMap((l) => l.words);
  const exam = generateExam(words, "hsk1");
  return <ExamRunner exam={exam} />;
}
