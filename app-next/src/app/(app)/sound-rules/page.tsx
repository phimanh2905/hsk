/* /sound-rules (D4) — Quy tắc chuyển âm: bảng thanh điệu %, quy tắc âm đầu, âm cuối & vần, bài tập.
   Server SSG; tương tác (chấm điểm quiz + TTS) trong SoundQuiz. Port từ clone/sound-rules.html + clone/js/sound-rules.js.
   Thanh điệu mã hóa kép: dấu (shape) + label — tỉ lệ minh họa bằng bar token, không màu riêng theo thanh. */

import { soundRulesData } from "@/content/soundrules";
import SoundQuiz from "@/components/sound-rules/quiz-client";
import SpeakText from "@/components/sound-rules/speak-text";
import { Card } from "@/components/ui/card";
import { Pin } from "@/components/ui/icon";

export const metadata = {
  title: "Quy tắc chuyển âm",
  description: "Quy tắc chuyển âm tiếng Trung — bảng thanh điệu, quy tắc âm đầu, âm cuối & vần kèm bài tập.",
};

const D = soundRulesData;

function ExampleList({ examples, zhClass = "text-base" }: { examples: [string, string, string][]; zhClass?: string }) {
  return (
    <p className="flex flex-wrap gap-y-1">
      {examples.map((ex) => (
        <SpeakText key={ex[2]} text={ex[2]}>
          <span className={`zh ${zhClass} font-bold`}>{ex[0]}</span>
          <span className="text-xs font-semibold">{ex[1]}</span>
          <span className="text-xs text-action-primary font-bold zh">{ex[2]}</span>
        </SpeakText>
      ))}
    </p>
  );
}

function RuleList({ list }: { list: typeof D.initialRules }) {
  return (
    <div className="space-y-3">
      {list.map((r, ri) => (
        <div key={r.rule} className="border-l-4 border-action-primary bg-surface-paper rounded-r-control px-3 py-2">
          <p className="text-sm font-extrabold mb-1">
            <span className="text-action-primary">{ri + 1}.</span> {r.rule}
          </p>
          <ExampleList examples={r.examples} />
        </div>
      ))}
    </div>
  );
}

export default function SoundRulesPage() {
  return (
    <div className="mb-8">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Quy tắc chuyển âm</h1>
        <p className="text-sm mt-2">
          Từ âm Hán Việt đoán ra pinyin: bảng thanh điệu, quy tắc âm đầu, âm cuối và vần, kèm ví dụ
          trong giáo trình HSK và bài tập áp dụng.
        </p>
        <p className="text-xs text-text-secondary font-semibold mt-2 inline-flex items-center gap-1.5">
          <Pin size={14} strokeWidth={1.5} aria-hidden="true" /> {D.note}
        </p>
      </header>

      {/* ============ Bảng thanh điệu ============ */}
      <Card className="p-4 sm:p-5 mb-8">
        <h2 className="font-extrabold text-lg mb-3">Bảng thanh điệu</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="text-left">
                <th className="border border-border-default bg-surface-paper px-3 py-2 font-bold">Thanh Hán Việt</th>
                <th className="border border-border-default bg-surface-paper px-3 py-2 font-bold">Thanh pinyin</th>
                <th className="border border-border-default bg-surface-paper px-3 py-2 font-bold">Ví dụ</th>
              </tr>
            </thead>
            <tbody>
              {D.toneRows.map((row) => (
                <tr key={row.name}>
                  <td className="border border-border-default px-3 py-2 font-extrabold align-top">
                    {row.name}
                    <br />
                    <span className="text-xs font-semibold text-text-secondary">
                      {row.sample ? `mẫu ${row.count} chữ` : `(${row.count} chữ)`}
                    </span>
                  </td>
                  <td className="border border-border-default px-3 py-2 align-top min-w-[260px]">
                    {row.tones.map((t) => (
                      <div key={t.label} className="flex items-center gap-2 mb-1.5">
                        <span className="text-xl font-extrabold zh w-10">{t.mark}</span>
                        <span className="text-xs font-bold text-text-secondary w-14">{t.label}</span>
                        <span className="flex-1 h-3 rounded bg-surface-paper border border-border-default overflow-hidden">
                          <span className="block h-full rounded bg-action-primary" style={{ width: t.pct + "%" }} />
                        </span>
                        <span className="text-xs font-extrabold w-10 text-right">{t.pct}%</span>
                      </div>
                    ))}
                  </td>
                  <td className="border border-border-default px-3 py-2 align-top">
                    <ExampleList examples={row.examples} zhClass="text-lg" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* ============ Quy tắc âm đầu ============ */}
        <Card className="p-4 sm:p-5">
          <h2 className="font-extrabold text-lg mb-3">Quy tắc âm đầu</h2>
          <RuleList list={D.initialRules} />
        </Card>

        {/* ============ Quy tắc âm cuối & vần ============ */}
        <Card className="p-4 sm:p-5">
          <h2 className="font-extrabold text-lg mb-3">Quy tắc âm cuối &amp; vần</h2>
          <RuleList list={D.finalRules} />
        </Card>
      </div>

      {/* ============ Bài tập áp dụng ============ */}
      <Card className="p-4 sm:p-5 mb-8">
        <h2 className="font-extrabold text-lg mb-1">Bài tập áp dụng</h2>
        <p className="text-sm text-text-secondary font-semibold mb-4">
          Đoán pinyin từ âm Hán Việt — chọn một đáp án để xem chấm điểm và giải thích.
        </p>
        <SoundQuiz />
      </Card>
    </div>
  );
}
