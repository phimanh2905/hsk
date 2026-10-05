import { z } from "zod";

export type EntryKind = "wrong" | "chars" | "personal";

export const wrongPayload = z.object({
  q: z.string().min(1),
  wrong: z.object({ zh: z.string().min(1), py: z.string().optional() }).nullable(),
  right: z.object({ zh: z.string().min(1), py: z.string().optional() }),
  cause: z.string().min(1),
});
export const charsPayload = z.object({
  chars: z.array(z.object({ zh: z.string().min(1), py: z.string().min(1) })).min(2).max(4),
  tip: z.string().min(1),
});
export const personalPayload = z.object({ note: z.string().min(2) });

export type WrongPayload = z.infer<typeof wrongPayload>;
export type CharsPayload = z.infer<typeof charsPayload>;
export type PersonalPayload = z.infer<typeof personalPayload>;
export type EntryPayload = WrongPayload | CharsPayload | PersonalPayload;

export const payloadByKind = {
  wrong: wrongPayload,
  chars: charsPayload,
  personal: personalPayload,
} as const;

export function parsePayload(kind: EntryKind, data: unknown): EntryPayload {
  return payloadByKind[kind].parse(data);
}
export function safeParsePayload(kind: EntryKind, data: unknown): EntryPayload | null {
  const r = payloadByKind[kind].safeParse(data);
  return r.success ? r.data : null;
}
