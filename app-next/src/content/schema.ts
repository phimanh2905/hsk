import { z } from "zod";

export const pinyinPerCharSchema = z.object({ c: z.string().min(1), py: z.string() });
export const exampleSchema = z.object({
  zh: z.string().min(1),
  pinyinPerChar: z.array(pinyinPerCharSchema).min(1),
  vi: z.string().min(1),
});
export const vocabWordSchema = z.object({
  hanzi: z.string().min(1),
  pinyin: z.string().min(1),
  hanViet: z.string().min(1),
  meaning: z.string().min(1),
  pos: z.string().min(1),
  example: exampleSchema,
});
export const vocabLessonSchema = z.object({ title: z.string().min(1), words: z.array(vocabWordSchema).min(1) });
export const vocabSchema = vocabLessonSchema;
export const lessonMetaSchema = z.object({
  pageId: z.string(), order: z.number(), title: z.string(),
  words: z.number().optional(), meta: z.string().optional(),
  skill: z.enum(["vocab", "grammar", "hanzi"]),
});
export const courseSchema = z.object({ pages: z.array(lessonMetaSchema).min(1) });

/* ================= Foundation data (Task 8) ================= */
export const pinyinValidSchema = z.record(z.string(), z.record(z.string(), z.string()));
export const pinyinExamplesSchema = z.record(z.string(), z.array(z.tuple([z.string(), z.string(), z.string()])));
export const radicalSchema = z.object({
  i: z.number(),
  char: z.string().min(1),
  hanViet: z.string().min(1),
  meaning: z.string().min(1),
  strokes: z.number(),
});
export const radicalsSchema = z.array(radicalSchema);
export const strokeRuleSchema = z.object({
  n: z.number(),
  name: z.string().min(1),
  chars: z.array(z.string().min(1)).min(1),
  desc: z.string().min(1),
});
export const strokeRulesSchema = z.array(strokeRuleSchema);
export const lastStrokesSchema = z.array(z.object({ glyph: z.string().min(1), name: z.string().min(1) }));
export const toneRowSchema = z.object({
  name: z.string().min(1),
  count: z.number(),
  sample: z.boolean().optional(),
  tones: z.array(z.object({ label: z.string(), mark: z.string(), pct: z.number() })),
  examples: z.array(z.tuple([z.string(), z.string(), z.string()])),
});
export const soundRuleSchema = z.object({
  rule: z.string().min(1),
  examples: z.array(z.tuple([z.string(), z.string(), z.string()])),
});
export const soundQuizSchema = z.object({
  q: z.string().min(1),
  options: z.array(z.string()).min(2),
  answer: z.number(),
  explain: z.string().min(1),
});
export const soundRulesDataSchema = z.object({
  note: z.string().min(1),
  toneTotal: z.number(),
  toneColors: z.record(z.string(), z.string()),
  toneRows: z.array(toneRowSchema).min(1),
  initialRules: z.array(soundRuleSchema),
  finalRules: z.array(soundRuleSchema),
  quiz: z.array(soundQuizSchema).min(1),
});
