import type { Metadata } from "next";
import ExamRemote from "./exam-remote";

/* W6.3 — /certificate-test/[level]: đề thi demo. Hiện chỉ HSK1 (từ vocab demo
   HSK1 — gộp tất cả pages của book), level khác → 404 (dynamicParams=false).
   SSG: exam build client-side bằng generateExam (pure, client-safe) trên data
   fetch từ /api/v1/content/vocab — page không đọc D1 lúc build. */
export const dynamicParams = false;

export function generateStaticParams(): { level: string }[] {
  return [{ level: "hsk1" }];
}

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
  return <ExamRemote level={level} />;
}
