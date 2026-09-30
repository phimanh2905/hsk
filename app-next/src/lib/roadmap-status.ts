/* Roadmap Pinyin — trạng thái khoá tuần tự của 1 buổi (SPEC-05 §2 + SPEC-21 §A).
   Thuần (pure) để test được và tái dùng ở Task 27 (session page). */

export type SessionStatus = "done" | "current" | "locked";

export function sessionStatus(done: number[], n: number): SessionStatus {
  if (done.includes(n)) return "done";
  if (n === 1 || done.includes(n - 1)) return "current";
  return "locked";
}
