/* Chấm tự luận (W6.3) — pure functions.
   normalizeAnswer: trim + bỏ khoảng trắng và dấu câu Trung/Việt/Anh.
   countHanChars: đếm ký tự Hán [\u3400-\u9fff] (tham số RE từ nhaihsk). */

/* eslint-disable no-irregular-whitespace */
const STRIP_RE = /[\s，。？！、：；“”‘’（）()「」《》…,.?!:;'"]/g;
const HAN_RE = /[\u3400-\u9fff]/g;

export function normalizeAnswer(s: string): string {
  return s.replace(STRIP_RE, "");
}

export function countHanChars(s: string): number {
  return (s.match(HAN_RE) ?? []).length;
}

export function gradeFreeAnswer(
  input: string,
  sample: string
): { correct: boolean; hanCount: number } {
  const hanCount = countHanChars(input);
  const correct =
    normalizeAnswer(input) === normalizeAnswer(sample) &&
    hanCount >= countHanChars(sample);
  return { correct, hanCount };
}
