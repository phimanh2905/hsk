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
