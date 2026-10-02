import type { Metadata } from "next";
import { certificateData } from "@/content/certificates";
import CertificateCardItem from "./card";

/* /certificate-test — G9 (spec 11, port clone/js/certificate-test.html + SPEC-07 mục 2).
   SSG server component; card là client nhỏ cho toast coming-soon. */

export const metadata: Metadata = {
  title: "Luyện thi chứng chỉ | Nhai HSK",
  description: "考试对策 — Luyện thi HSK và các chứng chỉ tiếng Trung",
};

export default function CertificateTestPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <section>
        <h2 className="text-xl font-bold">HSK 1–9 — Chuẩn HSK 3.0</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Chuẩn năng lực Hán ngữ quốc tế 2021 “ba bậc chín cấp”: sơ đẳng 1–3, trung đẳng 4–6, cao đẳng 7–9
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certificateData.hsk.map((c) => (
            <CertificateCardItem key={c.logo} {...c} />
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-xl font-bold">HSKK — Kỳ thi nói</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Kỳ thi nói riêng 3 cấp (sơ – trung – cao) — thường đăng ký kèm HSK để chứng minh kỹ năng nói
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certificateData.hskk.map((c) => (
            <CertificateCardItem key={c.logo} {...c} />
          ))}
        </div>
      </section>
    </div>
  );
}
