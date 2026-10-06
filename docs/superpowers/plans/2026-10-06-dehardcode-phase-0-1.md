# Dehardcode Pha 0 + Pha 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix các điểm config rủi ro, dựng content layer `src/lib/content/`, và chuyển 2 dataset đau nhất (vocab, shadowing) sang D1 — content sửa được qua D1 mà không cần deploy.

**Architecture:** Content facade bất đồng bộ (`src/lib/content/`) che nguồn dữ liệu; client components truy cập vocab/shadowing qua API `/api/v1/content/*`; server pages đọc D1 trực tiếp qua facade và chuyển `force-dynamic` (không truy vấn D1 lúc build). Schema drizzle + seed SQL idempotent sinh từ data static hiện có.

**Tech Stack:** Next.js 16 (App Router), @opennextjs/cloudflare, Drizzle ORM + Cloudflare D1, wrangler, Vitest, Playwright, zod.

**Spec:** `docs/superpowers/specs/2026-10-06-dehardcode-content-design.md`

## Global Constraints

- Mọi lệnh chạy từ `/Users/manhphihong/Documents/Developments/hsk/app-next` (wrangler bắt buộc chạy từ đây — có `wrangler.jsonc`).
- Package manager: `pnpm`. Node 22.
- D1 local: `pnpm wrangler d1 migrations apply hsk --local` / `pnpm wrangler d1 execute hsk --local --file ...` (binding đọc từ `wrangler.jsonc`, DB tên `hsk`). DB dev remote tên `hsk-dev` (config `wrangler.dev.jsonc`) — chỉ áp khi cần test remote. Prod DB `hsk --remote` áp thủ công lúc deploy, không nằm trong plan này.
- Test: `pnpm test` (vitest). Typecheck: `pnpm typecheck`. Lint: `pnpm lint`. Chạy cả 3 trước khi commit mỗi task.
- **KHÔNG truy vấn D1 trong `generateStaticParams` hoặc lúc build.** Trang dùng data D1 phải `export const dynamic = "force-dynamic"`.
- Comment code theo style hiện có: tiếng Việt, chỉ giải thích ràng buộc mà code không tự hiện ra.
- Không sửa `clone/`, không đổi brand/data clone port 1:1 ngoài những chỗ task chỉ định.
- Mỗi task kết thúc bằng 1 commit riêng.

---

### Task 1: Module config — `SITE_URL` tập trung

**Files:**
- Create: `src/lib/config.ts`
- Create: `src/lib/__tests__/config.test.ts`
- Modify: `src/app/sitemap.ts` (dòng 3: xóa `const BASE = process.env...`, import `SITE_URL`)
- Modify: `src/app/robots.ts` (dòng 6: thay fallback bằng `SITE_URL`)

**Interfaces:**
- Consumes: không.
- Produces: `SITE_URL: string` từ `@/lib/config` — Task về sau dùng khi cần origin; `DAILY_GOAL_XP` sẽ chuyển sang đây ở plan Pha 3 (không làm trong plan này).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/config.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

describe("SITE_URL (lib/config)", () => {
  beforeEach(() => vi.resetModules());

  it("throw khi thiếu NEXT_PUBLIC_SITE_URL ở production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    await expect(import("@/lib/config")).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it("fallback localhost ở dev khi thiếu", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const { SITE_URL } = await import("@/lib/config");
    expect(SITE_URL).toBe("http://localhost:3100");
  });

  it("bỏ dấu / thừa ở cuối", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://byehsk.example/");
    const { SITE_URL } = await import("@/lib/config");
    expect(SITE_URL).toBe("https://byehsk.example");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/config.test.ts`
Expected: FAIL — module `@/lib/config` không tồn tại.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/config.ts
/* Config tập trung cho toàn app (spec dehardcode §5 Pha 0) — thay các fallback
   URL cứng rải rác trong sitemap/robots. NEXT_PUBLIC_* được Next inline lúc build,
   nên giá trị phải có sẵn trong môi trường build (xem .env.production). */

function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw) return raw.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Thiếu NEXT_PUBLIC_SITE_URL khi build production — sitemap/robots sẽ sinh URL sai."
    );
  }
  return "http://localhost:3100";
}

export const SITE_URL = resolveSiteUrl();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/config.test.ts`
Expected: PASS 3/3.

- [ ] **Step 5: Đổi sitemap.ts và robots.ts sang SITE_URL**

`src/app/sitemap.ts` — xóa dòng `const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";`, thêm import và dùng:

```ts
import { SITE_URL } from "@/lib/config";
```
và mọi chỗ `BASE + p` giữ nguyên (đổi tên biến nếu muốn thành `SITE_URL`). `src/app/robots.ts`:

```ts
import { SITE_URL } from "@/lib/config";
// ...
sitemap: `${SITE_URL}/sitemap.xml`,
```

- [ ] **Step 6: Verify toàn bộ + commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: sạch, không test nào fail mới.
```bash
git add src/lib/config.ts src/lib/__tests__/config.test.ts src/app/sitemap.ts src/app/robots.ts
git commit -m "refactor: gom SITE_URL vào lib/config, bỏ fallback URL cứng trong sitemap/robots"
```

---

### Task 2: Secrets auth — bỏ fallback `process.env` ở production

**Files:**
- Create: `src/lib/auth-secrets.ts`
- Create: `src/lib/__tests__/auth-secrets.test.ts`
- Modify: `src/lib/auth.ts` (khối destructuring secrets trong `createAuth()`, khoảng dòng 18–28)

**Interfaces:**
- Consumes: không.
- Produces: `resolveAuthSecrets(env: Record<string, string | undefined>, nodeEnv: string | undefined): AuthSecrets` — `auth.ts` là consumer duy nhất.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/auth-secrets.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAuthSecrets } from "@/lib/auth-secrets";

const BINDING = { BETTER_AUTH_SECRET: "s-binding", GOOGLE_CLIENT_ID: "i-binding", GOOGLE_CLIENT_SECRET: "g-binding" };

afterEach(() => vi.unstubAllEnvs());

describe("resolveAuthSecrets", () => {
  it("ưu tiên env binding (wrangler) hơn process.env", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "s-dotenv");
    expect(resolveAuthSecrets(BINDING, "development").BETTER_AUTH_SECRET).toBe("s-binding");
  });

  it("ở dev: fallback process.env khi binding thiếu", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "s-dotenv");
    vi.stubEnv("GOOGLE_CLIENT_ID", "i-dotenv");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "g-dotenv");
    const s = resolveAuthSecrets({}, "development");
    expect(s).toEqual({ BETTER_AUTH_SECRET: "s-dotenv", GOOGLE_CLIENT_ID: "i-dotenv", GOOGLE_CLIENT_SECRET: "g-dotenv" });
  });

  it("ở production: KHÔNG fallback process.env → throw khi binding thiếu", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "s-dotenv");
    expect(() => resolveAuthSecrets({}, "production")).toThrow(/Thiếu BETTER_AUTH_SECRET/);
  });

  it("throw khi thiếu hoàn toàn kể cả ở dev", () => {
    expect(() => resolveAuthSecrets({}, "development")).toThrow(/Thiếu BETTER_AUTH_SECRET/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/auth-secrets.test.ts`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/auth-secrets.ts
export type AuthSecrets = {
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
};

/* Fallback process.env CHỈ cho dev: .env.local của Next không nằm trong binding
   wrangler (initOpenNextCloudflareForDev gọi getPlatformProxy với envFiles: []).
   Production phải lấy secret từ `wrangler secret put` — nếu thiếu thì fail sớm
   thay vì chạy với secret rò từ .env. */
export function resolveAuthSecrets(
  env: Record<string, string | undefined>,
  nodeEnv: string | undefined
): AuthSecrets {
  const allowFallback = nodeEnv !== "production";
  const secrets = {
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET ?? (allowFallback ? process.env.BETTER_AUTH_SECRET : undefined),
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID ?? (allowFallback ? process.env.GOOGLE_CLIENT_ID : undefined),
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET ?? (allowFallback ? process.env.GOOGLE_CLIENT_SECRET : undefined),
  };
  if (!secrets.BETTER_AUTH_SECRET || !secrets.GOOGLE_CLIENT_ID || !secrets.GOOGLE_CLIENT_SECRET) {
    throw new Error(
      "Thiếu BETTER_AUTH_SECRET / GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. " +
        "Production: wrangler secret put <tên>. Local: thêm vào app-next/.env.local."
    );
  }
  return secrets;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/auth-secrets.test.ts`
Expected: PASS 4/4.

- [ ] **Step 5: Dùng trong auth.ts**

Trong `src/lib/auth.ts`, thay khối destructuring + check (khoảng dòng 18–28) bằng:

```ts
import { resolveAuthSecrets } from "@/lib/auth-secrets";
// ... trong createAuth(), sau const { env } = getCloudflareContext():
const { BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = resolveAuthSecrets(
  env as Record<string, string | undefined>,
  process.env.NODE_ENV
);
```
Xóa comment cũ giải thích fallback và khối `if (!BETTER_AUTH_SECRET ...) throw` (lỗi đã ném trong `resolveAuthSecrets`).

- [ ] **Step 6: Verify toàn bộ + commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: sạch. (Test auth hiện có nếu mock env — vẫn pass vì hành vi dev không đổi.)
```bash
git add src/lib/auth-secrets.ts src/lib/__tests__/auth-secrets.test.ts src/lib/auth.ts
git commit -m "refactor: secrets auth bỏ fallback process.env ở production (resolveAuthSecrets)"
```

---

### Task 3: `MOCK_ROWS` (notebooks.ts) đồng bộ với vocab.ts

**Files:**
- Modify: `src/content/notebooks.ts` (mảng `MOCK_ROWS`, dòng 20–33)
- Create: `src/content/__tests__/notebooks.test.ts`

**Interfaces:**
- Consumes: `vocab` từ `@/content/vocab` (`Record<string, Record<string, VocabLesson>>`), `notebooks` từ `@/content/notebooks`.
- Produces: không (data alignment nội bộ). Task 11 seed vocab từ `vocab.ts` nên dùng vocab làm nguồn chuẩn.

- [ ] **Step 1: Write the failing test**

```ts
// src/content/__tests__/notebooks.test.ts
import { describe, expect, it } from "vitest";
import { notebooks } from "@/content/notebooks";
import { vocab } from "@/content/vocab";

/* MOCK_ROWS chỉ để hiển thị khi sổ tay chưa có rows thật — không được drift
   khỏi vocab.ts (nguồn chuẩn, cũng là nguồn seed D1 ở Task 11). */
describe("notebooks samples (MOCK_ROWS)", () => {
  const vocabByHanzi = new Map<string, { pinyin: string; hanViet: string; meaning: string }>();
  for (const pages of Object.values(vocab)) {
    for (const lesson of Object.values(pages)) {
      for (const w of lesson.words) {
        if (!vocabByHanzi.has(w.hanzi)) {
          vocabByHanzi.set(w.hanzi, { pinyin: w.pinyin, hanViet: w.hanViet, meaning: w.meaning });
        }
      }
    }
  }

  it("mọi sample row trùng vocab.ts đều có pinyin/hanViet/meaning giống hệt", () => {
    for (const cfg of Object.values(notebooks)) {
      for (const s of cfg.samples) {
        for (const row of s.rows) {
          const w = vocabByHanzi.get(row.hanzi);
          if (!w) continue; // từ không có trong vocab.ts → bỏ qua
          expect(row.pinyin, `${row.hanzi}.pinyin`).toBe(w.pinyin);
          expect(row.hanViet, `${row.hanzi}.hanViet`).toBe(w.hanViet);
          expect(row.meaning, `${row.hanzi}.meaning`).toBe(w.meaning);
        }
      }
    }
  });

  it("ít nhất 8/12 từ MOCK_ROWS tồn tại trong vocab.ts (đảm bảo test có ý nghĩa)", () => {
    const rows = notebooks.vocab.samples.flatMap((s) => s.rows);
    const found = rows.filter((r) => vocabByHanzi.has(r.hanzi)).length;
    expect(found).toBeGreaterThanOrEqual(8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/content/__tests__/notebooks.test.ts`
Expected: FAIL — vài dòng MOCK_ROWS lệch pinyin/hanViet/meaning so với vocab (mock đang lowercase, vocab chuẩn Hán-Việt IN HOA).

- [ ] **Step 3: Chỉnh MOCK_ROWS theo assertion**

Sửa từng dòng trong `MOCK_ROWS` (`src/content/notebooks.ts:20-33`): với mỗi từ có trong `vocab.ts`, copy đúng 3 trường `pinyin`/`hanViet`/`meaning` từ entry vocab tương ứng (test fail cho biết dòng nào lệch). Giữ nguyên `hanzi`, giữ nguyên các từ không tìm thấy trong vocab.ts. Không đụng `sample()`/config hiển thị.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/content/__tests__/notebooks.test.ts`
Expected: PASS 2/2.

- [ ] **Step 5: Verify toàn bộ + commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`
```bash
git add src/content/notebooks.ts src/content/__tests__/notebooks.test.ts
git commit -m "fix: MOCK_ROWS notebooks đồng bộ pinyin/hanViet/meaning với vocab.ts"
```

---

### Task 4: `toneColors` (soundrules.ts) → CSS token

**Files:**
- Modify: `src/content/soundrules.ts` (map `toneColors`, khoảng dòng 19–24)
- Modify: `src/app/globals.css` (khối `:root`)
- Create: `src/content/__tests__/soundrules.test.ts`

Trước khi sửa, đọc `.zcode/skills/hanzi-design-system/SKILL.md` để đặt tên token đúng convention (prefix `--hz-`).

**Interfaces:**
- Consumes: export `toneColors` (map hex) từ `@/content/soundrules` — kiểm tra tên export thật trong file; nếu tên khác (vd nằm trong object lớn hơn) thì test ở Step 1 điều chỉnh import cho khớp.
- Produces: CSS token `--hz-tone-1..4` trong `globals.css`.

- [ ] **Step 1: Write the failing test**

```ts
// src/content/__tests__/soundrules.test.ts
import { describe, expect, it } from "vitest";
import { toneColors } from "@/content/soundrules";

/* Hex cứng trong data bypass theme (dark mode không đổi được) — phải tham chiếu
   token của design system. */
describe("toneColors (soundrules)", () => {
  it("mọi giá trị là tham chiếu var(--hz-tone-*), không hex cứng", () => {
    for (const [key, value] of Object.entries(toneColors)) {
      expect(value, `toneColors[${key}]`).toMatch(/^var\(--hz-tone-\d\)$/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/content/__tests__/soundrules.test.ts`
Expected: FAIL — các giá trị hiện là `#2563eb`, `#16a34a`, `#f5b301`, `#dc2626`.

- [ ] **Step 3: Thêm token vào globals.css và đổi toneColors**

Trong `src/app/globals.css`, khối `:root` (cạnh các token `--hz-*` hiện có):

```css
  --hz-tone-1: #2563eb;
  --hz-tone-2: #16a34a;
  --hz-tone-3: #f5b301;
  --hz-tone-4: #dc2626;
```

Trong `src/content/soundrules.ts`, thay 4 giá trị hex của `toneColors` bằng `var(--hz-tone-1)` … `var(--hz-tone-4)` (giữ nguyên key; kiểm tra chỗ render inline-style vẫn hoạt động — CSS var hợp lệ trong `style={{ }}`). Nếu dark mode cần tone khác, khai báo giá trị tương ứng trong khối dark của globals.css; không bắt buộc ở task này.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/content/__tests__/soundrules.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify toàn bộ + commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`
```bash
git add src/content/soundrules.ts src/app/globals.css src/content/__tests__/soundrules.test.ts
git commit -m "refactor: toneColors soundrules dùng token --hz-tone-* thay hex cứng"
```

---

### Task 5: Content facade (nguồn static) — vocab + shadowing

**Files:**
- Create: `src/lib/content/vocab.ts`
- Create: `src/lib/content/shadowing.ts`
- Create: `src/lib/content/__tests__/content-static.test.ts`

**Interfaces:**
- Consumes: `vocab`, types `VocabLesson`/`VocabWord` từ `@/content/vocab`; `shadowingPlaylists`, `shadowingVideos`, `shadowingSubtitles`, `shadowingVideoById`, `topicVi` và types từ `@/content/shadowing`.
- Produces (Task 6, 9, 10, 13, 14 phụ thuộc — giữ nguyên chữ ký):
  - `getVocab(): Promise<VocabData>`; `VocabData = Record<string, Record<string, VocabLesson>>`
  - `getVocabLesson(book: string, pageId: string): Promise<VocabLesson | null>`
  - `getVocabMeta(): Promise<VocabMeta>`; `VocabMeta = VocabBookMeta[]`; `VocabBookMeta = { book: string; lessons: { pageId: string; title: string; wordCount: number; firstHanzi: string }[] }`
  - `getShadowingPlaylists(): Promise<ShadowingPlaylist[]>`; `getShadowingVideos(): Promise<ShadowingVideo[]>`; `getShadowingSubtitles(): Promise<SubtitlesByVideo>`; `getShadowingVideoById(id): Promise<ShadowingVideo | null>`; `getShadowingSubtitlesByVideo(videoId: string): Promise<SubtitleSentence[] | null>`; `SubtitlesByVideo = Record<string, SubtitleSentence[]>`
  - re-export `topicVi` (label tĩnh, giữ trong code)
- Task 13 thay implementation bên trong bằng D1 — chữ ký không đổi.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/content/__tests__/content-static.test.ts
import { describe, expect, it } from "vitest";
import {
  getVocab, getVocabLesson, getVocabMeta,
} from "@/lib/content/vocab";
import {
  getShadowingPlaylists, getShadowingVideos, getShadowingSubtitles, getShadowingVideoById,
} from "@/lib/content/shadowing";
import { vocabWordSchema } from "@/content/schema";
import { vocab as staticVocab } from "@/content/vocab";
import { shadowingVideos as staticVideos, shadowingPlaylists as staticPlaylists } from "@/content/shadowing";

describe("content facade — vocab (nguồn static)", () => {
  it("getVocab trả đủ 6 book", async () => {
    const data = await getVocab();
    expect(Object.keys(data).sort()).toEqual(["hsk1", "hsk2", "hsk3", "hsk4", "hsk5", "hsk6"]);
  });

  it("mọi word khớp zod schema (dữ liệu seed sau này phải sạch)", async () => {
    const data = await getVocab();
    for (const pages of Object.values(data)) {
      for (const lesson of Object.values(pages)) {
        for (const w of lesson.words) {
          const r = vocabWordSchema.safeParse(w);
          expect(r.success, JSON.stringify(w).slice(0, 80)).toBe(true);
        }
      }
    }
  });

  it("getVocabLesson trả lesson / null khi sai key", async () => {
    expect((await getVocabLesson("hsk1", "lesson-1"))?.words.length).toBeGreaterThan(0);
    expect(await getVocabLesson("hsk9", "lesson-1")).toBeNull();
  });

  it("getVocabMeta: wordCount + firstHanzi khớp data", async () => {
    const meta = await getVocabMeta();
    const hsk1 = meta.find((b) => b.book === "hsk1");
    expect(hsk1).toBeDefined();
    const firstPage = Object.entries(staticVocab.hsk1)[0];
    const m0 = hsk1!.lessons[0];
    expect(m0.pageId).toBe(firstPage[0]);
    expect(m0.title).toBe(firstPage[1].title);
    expect(m0.wordCount).toBe(firstPage[1].words.length);
    expect(m0.firstHanzi).toBe(firstPage[1].words[0]?.hanzi ?? "");
  });
});

describe("content facade — shadowing (nguồn static)", () => {
  it("5 playlist, videos không mồ côi playlist", async () => {
    const playlists = await getShadowingPlaylists();
    const videos = await getShadowingVideos();
    expect(playlists.length).toBe(staticPlaylists.length);
    expect(videos.length).toBe(staticVideos.length);
    const ids = new Set(playlists.map((p) => p.id));
    for (const v of videos) expect(ids.has(v.playlistId), v.id).toBe(true);
  });

  it("subtitles có key đúng videoId, câu có start<=end", async () => {
    const subs = await getShadowingSubtitles();
    const videoIds = new Set(staticVideos.map((v) => v.id));
    for (const [vid, sentences] of Object.entries(subs)) {
      expect(videoIds.has(vid), vid).toBe(true);
      for (const s of sentences) expect(s.start).toBeLessThanOrEqual(s.end);
    }
  });

  it("getShadowingVideoById trả video/null", async () => {
    const videos = staticVideos;
    expect((await getShadowingVideoById(videos[0].id))?.id).toBe(videos[0].id);
    expect(await getShadowingVideoById("khong-ton-tai")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/content/__tests__/content-static.test.ts`
Expected: FAIL — `@/lib/content/vocab` không tồn tại.

- [ ] **Step 3: Write implementation (facade trỏ về static)**

```ts
// src/lib/content/vocab.ts
/* Content layer — vocab (spec dehardcode §4.1). Pages/components gọi qua đây,
   KHÔNG import trực tiếp src/content/vocab; nguồn dữ liệu (static → D1 ở Task 13)
   là chi tiết nội bộ, chữ ký bất đồng bộ giữ nguyên. */
import { vocab as staticVocab } from "@/content/vocab";
import type { VocabLesson, VocabWord } from "@/content/vocab";

export type { VocabLesson, VocabWord };
export type VocabData = Record<string, Record<string, VocabLesson>>;

export type VocabLessonMeta = { pageId: string; title: string; wordCount: number; firstHanzi: string };
export type VocabBookMeta = { book: string; lessons: VocabLessonMeta[] };
export type VocabMeta = VocabBookMeta[];

export async function getVocab(): Promise<VocabData> {
  return staticVocab;
}

export async function getVocabLesson(book: string, pageId: string): Promise<VocabLesson | null> {
  return staticVocab[book]?.[pageId] ?? null;
}

export async function getVocabMeta(): Promise<VocabMeta> {
  return Object.entries(staticVocab).map(([book, pages]) => ({
    book,
    lessons: Object.entries(pages).map(([pageId, lesson]) => ({
      pageId,
      title: lesson.title,
      wordCount: lesson.words.length,
      firstHanzi: lesson.words[0]?.hanzi ?? "",
    })),
  }));
}
```

```ts
// src/lib/content/shadowing.ts
/* Content layer — shadowing (spec dehardcode §4.1). Nguồn static, sẽ chuyển D1
   ở Task 13; chữ ký bất đồng bộ không đổi. topicVi là label UI tĩnh — giữ code. */
import {
  shadowingPlaylists as staticPlaylists,
  shadowingVideos as staticVideos,
  shadowingSubtitles as staticSubtitles,
  shadowingVideoById,
  topicVi,
  type ShadowingPlaylist,
  type ShadowingTopic,
  type ShadowingVideo,
  type SubtitleSentence,
} from "@/content/shadowing";

export type { ShadowingPlaylist, ShadowingTopic, ShadowingVideo, SubtitleSentence };
export { topicVi };

export type SubtitlesByVideo = Record<string, SubtitleSentence[]>;

export async function getShadowingPlaylists(): Promise<ShadowingPlaylist[]> {
  return staticPlaylists;
}

export async function getShadowingVideos(): Promise<ShadowingVideo[]> {
  return staticVideos;
}

export async function getShadowingSubtitles(): Promise<SubtitlesByVideo> {
  return staticSubtitles;
}

export async function getShadowingVideoById(id: string): Promise<ShadowingVideo | null> {
  return shadowingVideoById(id) ?? null;
}

export async function getShadowingSubtitlesByVideo(videoId: string): Promise<SubtitleSentence[] | null> {
  return staticSubtitles[videoId] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/content/__tests__/content-static.test.ts`
Expected: PASS 8/8.

- [ ] **Step 5: Verify toàn bộ + commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`
```bash
git add src/lib/content/ src/lib/content/__tests__/
git commit -m "feat: content layer facade vocab+shadowing (nguồn static, chữ ký async)"
```

---

### Task 6: API content routes — `/api/v1/content/vocab`, `vocab-meta`, `shadowing`

**Files:**
- Create: `src/app/api/v1/content/vocab/route.ts`
- Create: `src/app/api/v1/content/vocab-meta/route.ts`
- Create: `src/app/api/v1/content/shadowing/route.ts`
- Create: `src/app/api/v1/content/__tests__/content-routes.test.ts`

**Interfaces:**
- Consumes: facade Task 5 (`getVocab`, `getVocabMeta`, `getShadowingPlaylists`, `getShadowingVideos`, `getShadowingSubtitles`).
- Produces: HTTP API dùng bởi client loaders Task 7. Response shape: `vocab` → `VocabData` JSON; `vocab-meta` → `VocabMeta` JSON; `shadowing` → `{ playlists, videos, subtitles }`. Header `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/v1/content/__tests__/content-routes.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/content/vocab", () => ({
  getVocab: vi.fn(),
  getVocabMeta: vi.fn(),
}));
vi.mock("@/lib/content/shadowing", () => ({
  getShadowingPlaylists: vi.fn(),
  getShadowingVideos: vi.fn(),
  getShadowingSubtitles: vi.fn(),
}));

import { GET as GET_VOCAB } from "@/app/api/v1/content/vocab/route";
import { GET as GET_META } from "@/app/api/v1/content/vocab-meta/route";
import { GET as GET_SHADOWING } from "@/app/api/v1/content/shadowing/route";
import { getVocab, getVocabMeta } from "@/lib/content/vocab";
import { getShadowingPlaylists, getShadowingVideos, getShadowingSubtitles } from "@/lib/content/shadowing";

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/content/vocab", () => {
  it("200 + Cache-Control khi OK", async () => {
    vi.mocked(getVocab).mockResolvedValue({ hsk1: {} });
    const res = await GET_VOCAB();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
    expect(await res.json()).toEqual({ hsk1: {} });
  });
  it("500 khi nguồn lỗi", async () => {
    vi.mocked(getVocab).mockRejectedValue(new Error("DB down"));
    const res = await GET_VOCAB();
    expect(res.status).toBe(500);
  });
});

describe("GET /api/v1/content/vocab-meta", () => {
  it("200 khi OK", async () => {
    vi.mocked(getVocabMeta).mockResolvedValue([{ book: "hsk1", lessons: [] }]);
    const res = await GET_META();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ book: "hsk1", lessons: [] }]);
  });
  it("500 khi nguồn lỗi", async () => {
    vi.mocked(getVocabMeta).mockRejectedValue(new Error("DB down"));
    expect((await GET_META()).status).toBe(500);
  });
});

describe("GET /api/v1/content/shadowing", () => {
  it("200 + shape { playlists, videos, subtitles }", async () => {
    vi.mocked(getShadowingPlaylists).mockResolvedValue([]);
    vi.mocked(getShadowingVideos).mockResolvedValue([]);
    vi.mocked(getShadowingSubtitles).mockResolvedValue({});
    const res = await GET_SHADOWING();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ playlists: [], videos: [], subtitles: {} });
  });
  it("500 khi nguồn lỗi", async () => {
    vi.mocked(getShadowingVideos).mockRejectedValue(new Error("DB down"));
    expect((await GET_SHADOWING()).status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/api/v1/content/__tests__/content-routes.test.ts`
Expected: FAIL — route files chưa tồn tại.

- [ ] **Step 3: Write the 3 routes**

```ts
// src/app/api/v1/content/vocab/route.ts
import { NextResponse } from "next/server";
import { getVocab } from "@/lib/content/vocab";

/* Content dataset đọc hiếm/ghi hiếm — cache CDN 1h, stale 1 ngày. */
const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getVocab(), { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[api/v1/content/vocab]", err);
    return NextResponse.json({ error: "Không đọc được dữ liệu từ vựng" }, { status: 500 });
  }
}
```

```ts
// src/app/api/v1/content/vocab-meta/route.ts
import { NextResponse } from "next/server";
import { getVocabMeta } from "@/lib/content/vocab";

const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getVocabMeta(), { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[api/v1/content/vocab-meta]", err);
    return NextResponse.json({ error: "Không đọc được metadata từ vựng" }, { status: 500 });
  }
}
```

```ts
// src/app/api/v1/content/shadowing/route.ts
import { NextResponse } from "next/server";
import {
  getShadowingPlaylists,
  getShadowingSubtitles,
  getShadowingVideos,
} from "@/lib/content/shadowing";

const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [playlists, videos, subtitles] = await Promise.all([
      getShadowingPlaylists(),
      getShadowingVideos(),
      getShadowingSubtitles(),
    ]);
    return NextResponse.json({ playlists, videos, subtitles }, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[api/v1/content/shadowing]", err);
    return NextResponse.json({ error: "Không đọc được dữ liệu shadowing" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/api/v1/content/__tests__/content-routes.test.ts`
Expected: PASS 7/7.

- [ ] **Step 5: Verify toàn bộ + commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`
```bash
git add src/app/api/v1/content/
git commit -m "feat: API /api/v1/content/{vocab,vocab-meta,shadowing} với cache header"
```

---

### Task 7: Client loader + chuyển `command-index` / `command-palette` sang meta API

**Files:**
- Create: `src/lib/content/vocab-client.ts`
- Create: `src/lib/content/__tests__/vocab-client.test.ts`
- Modify: `src/components/shell/command-index.ts` (hàm `buildCommandIndex`, dòng 24–38)
- Modify: `src/components/shell/command-palette.tsx` (chỗ gọi `buildCommandIndex()`)

**Interfaces:**
- Consumes: HTTP API Task 6.
- Produces: `loadVocab(): Promise<VocabData>`, `loadVocabMeta(): Promise<VocabMeta>` (Promise cache module-level) — Task 8, 9, 10 dùng lại; `buildCommandIndex(lessons: LessonIndexEntry[]): CommandItem[]` với `LessonIndexEntry = { title: string; first?: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/content/__tests__/vocab-client.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  vi.resetModules(); // reset promise cache module-level giữa các test
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("loadVocabMeta", () => {
  it("GET /api/v1/content/vocab-meta và parse JSON", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([{ book: "hsk1", lessons: [] }]), { status: 200 }));
    const { loadVocabMeta } = await import("@/lib/content/vocab-client");
    const meta = await loadVocabMeta();
    expect(meta).toEqual([{ book: "hsk1", lessons: [] }]);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/content/vocab-meta");
  });

  it("throw khi response không ok", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));
    const { loadVocabMeta } = await import("@/lib/content/vocab-client");
    await expect(loadVocabMeta()).rejects.toThrow(/500/);
  });

  it("fetch 1 lần dù gọi nhiều lần (promise cache)", async () => {
    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));
    const { loadVocabMeta } = await import("@/lib/content/vocab-client");
    await Promise.all([loadVocabMeta(), loadVocabMeta()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("loadVocab", () => {
  it("GET /api/v1/content/vocab", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ hsk1: {} }), { status: 200 }));
    const { loadVocab } = await import("@/lib/content/vocab-client");
    expect(await loadVocab()).toEqual({ hsk1: {} });
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/content/vocab");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/content/__tests__/vocab-client.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Write vocab-client**

```ts
// src/lib/content/vocab-client.ts
/* Loader client-side cho vocab qua API content — dataset lên D1 (Task 13) thì
   client KHÔNG import được data trực tiếp nữa. Promise cache module-level:
   nhiều component cùng phiên chỉ fetch 1 lần. */
import type { VocabData, VocabMeta } from "@/lib/content/vocab";

let vocabCache: Promise<VocabData> | null = null;

export function loadVocab(): Promise<VocabData> {
  if (!vocabCache) {
    vocabCache = fetch("/api/v1/content/vocab").then((r) => {
      if (!r.ok) throw new Error(`content/vocab HTTP ${r.status}`);
      return r.json() as Promise<VocabData>;
    });
  }
  return vocabCache;
}

let metaCache: Promise<VocabMeta> | null = null;

export function loadVocabMeta(): Promise<VocabMeta> {
  if (!metaCache) {
    metaCache = fetch("/api/v1/content/vocab-meta").then((r) => {
      if (!r.ok) throw new Error(`content/vocab-meta HTTP ${r.status}`);
      return r.json() as Promise<VocabMeta>;
    });
  }
  return metaCache;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/content/__tests__/vocab-client.test.ts`
Expected: PASS 4/4.

- [ ] **Step 5: Chuyển buildCommandIndex nhận tham số**

`src/components/shell/command-index.ts` — xóa `import { vocab } from "@/content/vocab";`, đổi hàm thành:

```ts
export type LessonIndexEntry = { title: string; first?: string };

/* Gộp route tĩnh + tiêu đề bài học (meta nạp qua API content, xem command-palette).
   Defensive: lessons rỗng (API lỗi/chưa load) → chỉ route tĩnh. */
export function buildCommandIndex(lessons: LessonIndexEntry[]): CommandItem[] {
  const out: CommandItem[] = [...PAGES];
  for (const l of lessons) {
    if (!l.title) continue;
    out.push({ label: `${l.title}${l.first ? ` · ${l.first}` : ""}`, href: "/dictionary", group: "Từ vựng" });
  }
  return out;
}
```

- [ ] **Step 6: Chuyển command-palette.tsx nạp meta qua API**

Trong `src/components/shell/command-palette.tsx`:
1. Xóa import gián tiếp qua `command-index` nếu nó import `vocab`; thêm:
```ts
import { useEffect, useState } from "react";
import { buildCommandIndex, type LessonIndexEntry } from "@/components/shell/command-index";
import { loadVocabMeta } from "@/lib/content/vocab-client";
import type { CommandItem } from "@/components/shell/command-index";
```
2. Trong component `CommandPalette`, thay chỗ tính index (hiện gọi `buildCommandIndex()` không tham số) bằng state + effect:
```ts
const [items, setItems] = useState<CommandItem[]>(() => buildCommandIndex([]));

useEffect(() => {
  let alive = true;
  loadVocabMeta()
    .then((meta) => {
      if (!alive) return;
      const entries: LessonIndexEntry[] = meta.flatMap((b) =>
        b.lessons.map((l) => ({ title: l.title, first: l.firstHanzi || undefined }))
      );
      setItems(buildCommandIndex(entries));
    })
    .catch(() => {
      /* API lỗi → giữ nguyên route tĩnh (defensive như behavior cũ) */
    });
  return () => {
    alive = false;
  };
}, []);
```
Giữ nguyên phần render/lọc của palette, chỉ đổi nguồn `items`.

- [ ] **Step 7: Verify toàn bộ + commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: sạch. Nếu có test cũ của command-index gọi `buildCommandIndex()` không tham số, cập nhật thành `buildCommandIndex([{ title: "Bài 1", first: "你好" }])` và assert output.
```bash
git add src/lib/content/vocab-client.ts src/lib/content/__tests__/vocab-client.test.ts src/components/shell/command-index.ts src/components/shell/command-palette.tsx
git commit -m "refactor: command palette nạp bài học qua API vocab-meta thay import vocab trực tiếp"
```

---

### Task 8: `srs-session.ts` — tiêm vocab data thay import trực tiếp

**Files:**
- Modify: `src/lib/srs-session.ts` (import `vocab` dòng 4; `resolveWord` dòng 34–48; `buildQueue` dòng 57–77)
- Modify: các caller + test hiện có (tìm bằng grep, xem Step 4)

**Interfaces:**
- Consumes: `VocabData` type từ `@/lib/content/vocab` (type-only, an toàn client); loader `loadVocab()` từ Task 7.
- Produces: `resolveWord(key: string, vocabData: VocabData | null): { zh: string; pinyin: string; meaning: string } | null` và `buildQueue(items, level, now, vocabData: VocabData | null)` — caller phía client load vocab qua `loadVocab()` rồi truyền vào; `null` ⇒ chỉ resolve được key deck (hành vi khi chưa load xong).

- [ ] **Step 1: Sửa signature + test**

Đổi trong `src/lib/srs-session.ts`:
1. Xóa `import { vocab } from "@/content/vocab";`, thêm:
```ts
import type { VocabData } from "@/lib/content/vocab";
```
2. `resolveWord` thêm tham số, phần resolve key `book.page.idx` dùng `vocabData`:
```ts
export function resolveWord(
  key: string,
  vocabData: VocabData | null
): { zh: string; pinyin: string; meaning: string } | null {
  const dm = /^deck\.([^.]+)\.(\d+)$/.exec(key);
  if (dm) {
    for (const kind of ["vocab", "grammar"] as const) {
      const deck = progressStore.getDeckItem(kind, dm[1]);
      const row = deck?.rows[Number(dm[2])];
      if (row) return { zh: row.hanzi, pinyin: row.pinyin ?? "", meaning: row.meaning ?? "" };
    }
    return null;
  }
  const m = /^([^.]+)\.([^.]+)\.(\d+)$/.exec(key);
  if (!m || !vocabData) return null;
  const word = vocabData[m[1]]?.[m[2]]?.words[Number(m[3])];
  return word ? { zh: word.hanzi, pinyin: word.pinyin, meaning: word.meaning } : null;
}
```
3. `buildQueue` thêm tham số cuối và truyền xuống:
```ts
export function buildQueue(items: SrsItem[], level: string, now: number, vocabData: VocabData | null): ReviewableWord[] {
  // ... thân giữ nguyên, duy nhất dòng resolve đổi thành:
  const r = resolveWord(it.key, vocabData);
```

- [ ] **Step 2: Cập nhật test hiện có của srs-session**

Run: `pnpm vitest run src/lib/__tests__ -t srs` để tìm test file (ví dụ `src/lib/__tests__/srs-session.test.ts`). Với fixture vocab hiện có trong test, đổi call thành `resolveWord(key, fixtureVocab)` / `buildQueue(items, level, now, fixtureVocab)` (fixture = object `Record<book, Record<pageId, { title, words }>>` test đang dựng).
Run lại: `pnpm vitest run src/lib/__tests__ -t srs` → PASS.

- [ ] **Step 3: Cập nhật caller runtime**

Run: `grep -rn "buildQueue(\|resolveWord(" src --include="*.tsx" --include="*.ts" | grep -v __tests__ | grep -v "srs-session.ts"`
Với mỗi caller (client component): nạp vocab một lần bằng loader rồi truyền vào. Pattern:

```ts
const [vocabData, setVocabData] = useState<VocabData | null>(null);
useEffect(() => {
  let alive = true;
  loadVocab().then((d) => { if (alive) setVocabData(d); }).catch(() => { /* giữ null */ });
  return () => { alive = false; };
}, []);
// buildQueue(items, level, now, vocabData)
```
(Nếu caller là hook dùng `useMemo`, thêm `vocabData` vào deps.)

- [ ] **Step 4: Verify toàn bộ + commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`
```bash
git add src/lib/srs-session.ts src/lib/__tests__ src/components
git commit -m "refactor: srs-session nhận vocabData qua tham số, bỏ import vocab trực tiếp"
```

---

### Task 9: `home-summary.ts` — totals qua meta API

**Files:**
- Modify: `src/lib/home-summary.ts` (import `vocab` dòng 5; `DAILY_GOAL_XP` giữ nguyên; chỗ tính `vocabTotal`/`lessonsTotal`/title bài kế tiếp)

**Interfaces:**
- Consumes: `loadVocabMeta()` (Task 7), type `VocabMeta`.
- Produces: hook/summary hiện có giữ nguyên shape trả về (`HomeSummary`) — home page không đổi.

- [ ] **Step 1: Đọc file và định vị chỗ dùng vocab**

Run: `grep -n "vocab\." src/lib/home-summary.ts`
Đánh dấu mọi chỗ dùng giá trị `vocab` (thường là: tổng số từ toàn khóa học `vocabTotal`, title của bài kế tiếp). `courses` (từ `@/content/courses`) **giữ nguyên** — courses chưa lên D1 trong plan này.

- [ ] **Step 2: Đổi sang meta**

1. Xóa `import { vocab } from "@/content/vocab";`; thêm:
```ts
import { loadVocabMeta } from "@/lib/content/vocab-client";
import type { VocabMeta } from "@/lib/content/vocab";
```
2. Trong hook chính, thêm state + effect:
```ts
const [vocabMeta, setVocabMeta] = useState<VocabMeta | null>(null);
useEffect(() => {
  let alive = true;
  loadVocabMeta().then((m) => { if (alive) setVocabMeta(m); }).catch(() => { /* mặc định 0 */ });
  return () => { alive = false; };
}, []);
```
3. Tổng số từ — thay mọi chỗ đếm words từ `vocab` bằng:
```ts
const vocabTotal = useMemo(
  () => vocabMeta?.reduce((n, b) => n + b.lessons.reduce((m, l) => m + l.wordCount, 0), 0) ?? 0,
  [vocabMeta]
);
```
4. Title bài kế tiếp — nếu code tra `vocab[book][pageId].title`, thay bằng lookup từ meta:
```ts
const titleOf = (book: string, pageId: string): string | undefined =>
  vocabMeta?.find((b) => b.book === book)?.lessons.find((l) => l.pageId === pageId)?.title;
```
5. Trước khi meta load xong (`vocabMeta === null`) giữ giá trị mặc định 0/undefined như behavior try/catch cũ — không render NaN.

- [ ] **Step 3: Verify toàn bộ + commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Chạy `pnpm dev`, mở `http://localhost:3100` — dashboard home hiện số liệu như cũ (cần API vocab-meta hoạt động — đã có từ Task 6, nguồn vẫn static lúc này).
```bash
git add src/lib/home-summary.ts
git commit -m "refactor: home-summary dùng vocab-meta API thay import vocab trực tiếp"
```

---

### Task 10: `create-file/defaults.ts` — vocab chars qua loader

**Files:**
- Modify: `src/lib/create-file/defaults.ts` (import dòng 5; `vocabChars()` dòng 64–68; `cfDefaultsFor` dòng 71–77; `mergeCfState` dòng 81–95)
- Modify: caller + test (Step 3)

**Interfaces:**
- Consumes: `loadVocab()` (Task 7), type `VocabData`, `VocabWord`.
- Produces: `vocabCharsFrom(data: VocabData): CfChar[]`; `cfDefaultsFor(tpl: string | null, chars: CfChar[]): CfState`; `mergeCfState(raw: unknown, tpl: string | null, chars: CfChar[]): CfState` — chars do caller nạp 1 lần rồi truyền (giữ functions đồng bộ, không async-ripple).

- [ ] **Step 1: Sửa defaults.ts**

1. Xóa `import { vocab, type VocabWord } from "@/content/vocab";`, thêm:
```ts
import type { VocabData, VocabWord } from "@/lib/content/vocab";
```
2. Đổi `vocabChars()` thành hàm thuần nhận data:
```ts
export function vocabCharsFrom(data: VocabData): CfChar[] {
  /* 4 từ mẫu đầu Bài 1 HSK1 (đếm "4 từ sẽ có trong bản in") */
  const words: VocabWord[] = data.hsk1?.["lesson-1"]?.words.slice(0, 4) ?? [];
  return words.map((w) => ({ hanzi: w.hanzi, pinyin: w.pinyin, hv: w.hanViet, meaning: w.meaning }));
}
```
3. `cfDefaultsFor` và `mergeCfState` thêm tham số `chars`:
```ts
export function cfDefaultsFor(tpl: string | null, chars: CfChar[]): CfState {
  const d = cfDefaults();
  d.tpl = tpl || null;
  if (tpl === "stroke-order" || tpl === "big-char") d.chars = fallbackChars();
  else if (tpl === "vocab") d.chars = chars;
  return d;
}

export function mergeCfState(raw: unknown, tpl: string | null, chars: CfChar[]): CfState {
  const d = cfDefaultsFor(tpl, chars);
  // ... thân giữ nguyên từ đây
}
```

- [ ] **Step 2: Cập nhật caller**

Run: `grep -rn "cfDefaultsFor(\|mergeCfState(\|vocabChars(" src --include="*.tsx" --include="*.ts" | grep -v __tests__ | grep -v "defaults.ts"`
Caller (component create-file): nạp chars một lần bằng loader rồi truyền vào mọi call:
```ts
const [vocabChars, setVocabChars] = useState<CfChar[]>([]);
useEffect(() => {
  let alive = true;
  loadVocab()
    .then((d) => { if (alive) setVocabChars(vocabCharsFrom(d)); })
    .catch(() => { /* rỗng → template vocab dùng [] tạm */ });
  return () => { alive = false; };
}, []);
// mergeCfState(raw, tpl, vocabChars)
```

- [ ] **Step 3: Cập nhật test hiện có**

Run: `pnpm vitest run src/lib/__tests__ src/lib/create-file 2>/dev/null; grep -rln "cfDefaultsFor\|mergeCfState\|vocabChars" src --include="*.test.ts"`
Test gọi `cfDefaultsFor(tpl)` → thêm tham số fixture chars (vd `cfDefaultsFor("vocab", [{ hanzi: "学习", pinyin: "xué xí", hv: "HỌC TẬP", meaning: "học tập" }])`); assert giữ nguyên.

- [ ] **Step 4: Verify toàn bộ + commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`
```bash
git add src/lib/create-file/defaults.ts src/lib/create-file src/components
git commit -m "refactor: create-file defaults nhận vocabChars qua tham số thay import vocab"
```

---

### Task 11: D1 cho vocab — schema, migration 0003, seed

**Files:**
- Modify: `src/lib/db/schema.ts` (thêm bảng `content_vocabs` cuối file)
- Create: `drizzle/0003_*.sql` (sinh bằng drizzle-kit — KHÔNG viết tay)
- Create: `scripts/seed/gen-vocab-seed.mts`
- Create: `drizzle/seeds/content-vocabs.sql` (sinh bởi script)

**Interfaces:**
- Consumes: `vocab` từ `@/content/vocab` (nguồn seed).
- Produces: bảng `content_vocabs(book TEXT, page_id TEXT, ord INTEGER, title TEXT, words JSON, PK(book, page_id))` — Task 13 đọc qua drizzle.

- [ ] **Step 1: Thêm bảng vào schema.ts**

Cuối `src/lib/db/schema.ts`:

```ts
/* ================= Content datasets (spec dehardcode §4.2) =================
   Bảng content_* tách khỏi auth/user. Cấu trúc lồng (mảng words) lưu JSON —
   đọc nhiều/ghi hiếm, giữ 1:1 với type bên app. `ord` giữ thứ tự lesson/row
   vì SELECT từ D1 không bảo toàn thứ tự key của object gốc. */

export const contentVocabs = sqliteTable(
  "content_vocabs",
  {
    book: text("book").notNull(),
    pageId: text("page_id").notNull(),
    ord: integer("ord").notNull(),
    title: text("title").notNull(),
    words: text("words", { mode: "json" }).$type<VocabWordRow[]>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.book, t.pageId] })]
);

/* Shape khớp VocabWord (src/content/vocab.ts) — khai báo structurally thay vì
   import để schema.ts không phụ thuộc content module. */
type VocabWordRow = {
  hanzi: string;
  pinyin: string;
  hanViet: string;
  meaning: string;
  pos: string;
  example: { zh: string; pinyinPerChar: { c: string; py: string }[]; vi: string };
};
```

- [ ] **Step 2: Sinh migration**

Run: `pnpm drizzle-kit generate`
Expected: tạo `drizzle/0003_<tên>.sql` chứa `CREATE TABLE content_vocabs` (+ `drizzle/meta/0003_snapshot.json`). Kiểm tra: `grep "content_vocabs" drizzle/0003_*.sql` có `CREATE TABLE`.

- [ ] **Step 3: Write seed generator script**

```ts
// scripts/seed/gen-vocab-seed.mts
/* Sinh drizzle/seeds/content-vocabs.sql từ src/content/vocab.ts (nguồn chuẩn,
   spec dehardcode §4.2). Idempotent: INSERT OR REPLACE theo PK (book, page_id).
   Chạy: pnpm dlx tsx scripts/seed/gen-vocab-seed.mts (từ app-next/) */
import { mkdirSync, writeFileSync } from "node:fs";
import { vocab } from "../../src/content/vocab";

const esc = (s: string) => s.replace(/'/g, "''");
const lines: string[] = [
  "-- Seed content_vocabs — sinh tự động, đừng sửa tay. Chạy lại gen-vocab-seed.mts để cập nhật.",
];

for (const [book, pages] of Object.entries(vocab)) {
  Object.entries(pages).forEach(([pageId, lesson], i) => {
    const words = esc(JSON.stringify(lesson.words));
    lines.push(
      `INSERT OR REPLACE INTO content_vocabs (book, page_id, ord, title, words) VALUES ('${esc(book)}', '${esc(pageId)}', ${i}, '${esc(lesson.title)}', '${words}');`
    );
  });
}

mkdirSync("drizzle/seeds", { recursive: true });
writeFileSync("drizzle/seeds/content-vocabs.sql", lines.join("\n") + "\n");
console.log(`Đã ghi ${lines.length - 1} rows -> drizzle/seeds/content-vocabs.sql`);
```

Lưu ý: nếu `tsx` không resolve alias `@/lib/pinyin-utils` mà `vocab.ts` import, thêm `--tsconfig tsconfig.json` vào lệnh chạy; vẫn lỗi thì chạy generator bằng vitest (vitest đã có alias config): tạo tạm `scripts/seed/gen-vocab-seed.test.ts` bọc cùng thân script trong `it(...)` rồi `pnpm vitest run scripts/seed`.

- [ ] **Step 4: Sinh seed và kiểm tra**

Run: `pnpm dlx tsx scripts/seed/gen-vocab-seed.mts`
Expected: stdout `Đã ghi N rows` (N ≈ 63). `head -c 300 drizzle/seeds/content-vocabs.sql` thấy INSERT OR REPLACE hợp lệ.

- [ ] **Step 5: Apply migration + seed vào D1 local**

Run:
```bash
pnpm wrangler d1 migrations apply hsk --local
pnpm wrangler d1 execute hsk --local --file drizzle/seeds/content-vocabs.sql
pnpm wrangler d1 execute hsk --local --command "SELECT book, COUNT(*) AS lessons FROM content_vocabs GROUP BY book ORDER BY book"
```
Expected: bảng tạo xong; query trả 6 dòng hsk1–hsk6 với số lesson khớp static (hsk1 = 15). Chạy lần 2 file seed phải thành công không lỗi (idempotent).

- [ ] **Step 6: Verify toàn bộ + commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`
```bash
git add src/lib/db/schema.ts drizzle/0003_*.sql drizzle/meta scripts/seed drizzle/seeds
git commit -m "feat: bảng D1 content_vocabs + migration 0003 + seed idempotent từ vocab.ts"
```

---

### Task 12: D1 cho shadowing — schema, migration 0004, seed

**Files:**
- Modify: `src/lib/db/schema.ts` (thêm 3 bảng shadowing sau `contentVocabs`)
- Create: `drizzle/0004_*.sql` (drizzle-kit generate)
- Create: `scripts/seed/gen-shadowing-seed.mts`
- Create: `drizzle/seeds/content-shadowing.sql`

**Interfaces:**
- Consumes: `shadowingPlaylists`, `shadowingVideos`, `shadowingSubtitles` từ `@/content/shadowing`.
- Produces: 3 bảng `content_shadowing_playlists(id PK, ord, slug, name, total, desc, channel)`, `content_shadowing_videos(id PK, ord, title, playlist_id, hsk, views, views_suffix, duration, dur_sec, plays, topic, spd)`, `content_shadowing_subtitles(video_id PK, sentences JSON)` — Task 13 đọc.

- [ ] **Step 1: Thêm 3 bảng vào schema.ts**

```ts
export const contentShadowingPlaylists = sqliteTable("content_shadowing_playlists", {
  id: text("id").primaryKey(),
  ord: integer("ord").notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  total: integer("total").notNull(),
  desc: text("desc").notNull(),
  channel: text("channel").notNull(),
});

export const contentShadowingVideos = sqliteTable(
  "content_shadowing_videos",
  {
    id: text("id").primaryKey(),
    ord: integer("ord").notNull(),
    title: text("title").notNull(),
    playlistId: text("playlist_id").notNull(),
    hsk: text("hsk").notNull(),
    views: integer("views").notNull(),
    viewsSuffix: text("views_suffix").notNull(),
    duration: text("duration").notNull(),
    durSec: integer("dur_sec").notNull(),
    plays: integer("plays").notNull(),
    topic: text("topic").notNull(),
    spd: integer("spd").notNull(),
  },
  (t) => [index("csv_playlist_idx").on(t.playlistId)]
);

export const contentShadowingSubtitles = sqliteTable("content_shadowing_subtitles", {
  videoId: text("video_id").primaryKey(),
  sentences: text("sentences", { mode: "json" })
    .$type<{ n: number; start: number; end: number; parts: { zh: string }[]; pinyin: string; vi: string }[]>()
    .notNull(),
});
```

- [ ] **Step 2: Sinh migration**

Run: `pnpm drizzle-kit generate`
Expected: `drizzle/0004_<tên>.sql` chứa 3 CREATE TABLE + 1 index.

- [ ] **Step 3: Write seed generator**

```ts
// scripts/seed/gen-shadowing-seed.mts
/* Sinh drizzle/seeds/content-shadowing.sql từ src/content/shadowing.ts.
   Idempotent: INSERT OR REPLACE theo PK. Chạy: pnpm dlx tsx scripts/seed/gen-shadowing-seed.mts */
import { mkdirSync, writeFileSync } from "node:fs";
import { shadowingPlaylists, shadowingSubtitles, shadowingVideos } from "../../src/content/shadowing";

const esc = (s: string) => s.replace(/'/g, "''");
const lines: string[] = [
  "-- Seed content_shadowing_* — sinh tự động, đừng sửa tay.",
];

shadowingPlaylists.forEach((p, i) => {
  lines.push(
    `INSERT OR REPLACE INTO content_shadowing_playlists (id, ord, slug, name, total, desc, channel) VALUES ('${esc(p.id)}', ${i}, '${esc(p.slug)}', '${esc(p.name)}', ${p.total}, '${esc(p.desc)}', '${esc(p.channel)}');`
  );
});

shadowingVideos.forEach((v, i) => {
  lines.push(
    `INSERT OR REPLACE INTO content_shadowing_videos (id, ord, title, playlist_id, hsk, views, views_suffix, duration, dur_sec, plays, topic, spd) VALUES ('${esc(v.id)}', ${i}, '${esc(v.title)}', '${esc(v.playlistId)}', '${esc(v.hsk)}', ${v.views}, '${esc(v.viewsSuffix)}', '${esc(v.duration)}', ${v.durSec}, ${v.plays}, '${esc(v.topic)}', ${v.spd});`
  );
});

for (const [videoId, sentences] of Object.entries(shadowingSubtitles)) {
  lines.push(
    `INSERT OR REPLACE INTO content_shadowing_subtitles (video_id, sentences) VALUES ('${esc(videoId)}', '${esc(JSON.stringify(sentences))}');`
  );
}

mkdirSync("drizzle/seeds", { recursive: true });
writeFileSync("drizzle/seeds/content-shadowing.sql", lines.join("\n") + "\n");
console.log(`Đã ghi ${lines.length - 1} rows -> drizzle/seeds/content-shadowing.sql`);
```

- [ ] **Step 4: Sinh seed, apply, verify**

Run:
```bash
pnpm dlx tsx scripts/seed/gen-shadowing-seed.mts
pnpm wrangler d1 migrations apply hsk --local
pnpm wrangler d1 execute hsk --local --file drizzle/seeds/content-shadowing.sql
pnpm wrangler d1 execute hsk --local --command "SELECT (SELECT COUNT(*) FROM content_shadowing_playlists) AS p, (SELECT COUNT(*) FROM content_shadowing_videos) AS v, (SELECT COUNT(*) FROM content_shadowing_subtitles) AS s"
```
Expected: 5 playlists, số videos khớp static (~20), số subtitle tracks khớp static (~4).

- [ ] **Step 5: Verify toàn bộ + commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`
```bash
git add src/lib/db/schema.ts drizzle/0004_*.sql drizzle/meta scripts/seed drizzle/seeds
git commit -m "feat: 3 bảng D1 shadowing + migration 0004 + seed idempotent"
```

---

### Task 13: Facade đọc D1 — implementation swap

**Files:**
- Modify: `src/lib/content/vocab.ts` (toàn file — implementation D1, thêm pure helpers)
- Modify: `src/lib/content/shadowing.ts` (toàn file)
- Create: `src/lib/content/__tests__/content-d1-reshape.test.ts`

**Interfaces:**
- Consumes: bảng Task 11/12 qua `createDb()` (`@/lib/db`), schema `@/lib/db/schema`.
- Produces: **cùng hệt chữ ký Task 5** (getVocab, getVocabLesson, getVocabMeta, getShadowing*) + `ContentNotFoundError`. Đầu ra phải 1:1 với nguồn static (kiểm chứng bằng parity test Step 3 + seed gốc).

- [ ] **Step 1: Viết failing test cho pure reshape functions**

```ts
// src/lib/content/__tests__/content-d1-reshape.test.ts
import { describe, expect, it } from "vitest";
import { rowsToVocabData, rowsToVocabMeta, ContentNotFoundError } from "@/lib/content/vocab";
import { rowsToShadowing, ContentNotFoundError as ShadowingErr } from "@/lib/content/shadowing";
import { vocab as staticVocab } from "@/content/vocab";
import { shadowingVideos as staticVideos, shadowingSubtitles as staticSubs } from "@/content/shadowing";

/* Fixture = đúng shape seed sinh ra từ data static (Task 11/12): flatten các
   object gốc thành rows có ord. */
const vocabRows = Object.entries(staticVocab).flatMap(([book, pages]) =>
  Object.entries(pages).map(([pageId, lesson], i) => ({
    book, pageId, ord: i, title: lesson.title, words: lesson.words,
  }))
);

describe("rowsToVocabData / rowsToVocabMeta", () => {
  it("tái tạo đúng shape static (parity)", () => {
    expect(rowsToVocabData(vocabRows)).toEqual(staticVocab);
  });
  it("meta: số lesson + wordCount khớp", () => {
    const meta = rowsToVocabMeta(vocabRows);
    const hsk1 = meta.find((b) => b.book === "hsk1")!;
    expect(hsk1.lessons.length).toBe(Object.keys(staticVocab.hsk1).length);
    expect(hsk1.lessons[0].wordCount).toBe(Object.values(staticVocab.hsk1)[0].words.length);
    expect(hsk1.lessons[0].firstHanzi).toBe(Object.values(staticVocab.hsk1)[0].words[0].hanzi);
  });
  it("ContentNotFoundError có tên đúng", () => {
    const e = new ContentNotFoundError("content_vocabs");
    expect(e.name).toBe("ContentNotFoundError");
    expect(e.message).toContain("content_vocabs");
  });
});

const videoRows = staticVideos.map((v, i) => ({ ...v, ord: i }));
const subRows = Object.entries(staticSubs).map(([videoId, sentences]) => ({ videoId, sentences }));

describe("rowsToShadowing", () => {
  it("videos giữ thứ tự ord, topic cast về kiểu gốc", () => {
    const { videos } = rowsToShadowing(videoRows, subRows);
    expect(videos.map((v) => v.id)).toEqual(staticVideos.map((v) => v.id));
    expect(videos[0].topic).toBe(staticVideos[0].topic);
  });
  it("subtitles 1:1", () => {
    const { subtitles } = rowsToShadowing(videoRows, subRows);
    expect(subtitles).toEqual(staticSubs);
  });
  it("ShadowingErr export đúng", () => {
    expect(new ShadowingErr("x").name).toBe("ContentNotFoundError");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/content/__tests__/content-d1-reshape.test.ts`
Expected: FAIL — `rowsToVocabData`/`rowsToShadowing` chưa tồn tại.

- [ ] **Step 3: Implement facade đọc D1**

```ts
// src/lib/content/vocab.ts — thay implementation, giữ types + chữ ký Task 5
import { and, asc, eq } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { contentVocabs } from "@/lib/db/schema";
import type { VocabLesson, VocabWord } from "@/content/vocab";

export type { VocabLesson, VocabWord };
export type VocabData = Record<string, Record<string, VocabLesson>>;

export type VocabLessonMeta = { pageId: string; title: string; wordCount: number; firstHanzi: string };
export type VocabBookMeta = { book: string; lessons: VocabLessonMeta[] };
export type VocabMeta = VocabBookMeta[];

export class ContentNotFoundError extends Error {
  constructor(dataset: string) {
    super(`Content dataset rỗng hoặc chưa seed: ${dataset}`);
    this.name = "ContentNotFoundError";
  }
}

type VocabRow = {
  book: string;
  pageId: string;
  ord: number;
  title: string;
  words: VocabWord[];
};

/* Pure function (test được): flatten rows → nested Record, sort theo ord. */
export function rowsToVocabData(rows: VocabRow[]): VocabData {
  const out: VocabData = {};
  for (const r of [...rows].sort((a, b) => a.ord - b.ord)) {
    (out[r.book] ??= {})[r.pageId] = { title: r.title, words: r.words };
  }
  return out;
}

export function rowsToVocabMeta(rows: VocabRow[]): VocabMeta {
  const data = rowsToVocabData(rows);
  return Object.entries(data).map(([book, pages]) => ({
    book,
    lessons: Object.entries(pages).map(([pageId, lesson]) => ({
      pageId,
      title: lesson.title,
      wordCount: lesson.words.length,
      firstHanzi: lesson.words[0]?.hanzi ?? "",
    })),
  }));
}

export async function getVocab(): Promise<VocabData> {
  const rows = await createDb().select().from(contentVocabs).orderBy(asc(contentVocabs.ord));
  if (rows.length === 0) throw new ContentNotFoundError("content_vocabs");
  return rowsToVocabData(rows);
}

export async function getVocabLesson(book: string, pageId: string): Promise<VocabLesson | null> {
  const rows = await createDb()
    .select()
    .from(contentVocabs)
    .where(and(eq(contentVocabs.book, book), eq(contentVocabs.pageId, pageId)));
  return rows[0] ? { title: rows[0].title, words: rows[0].words } : null;
}

export async function getVocabMeta(): Promise<VocabMeta> {
  const rows = await createDb().select().from(contentVocabs).orderBy(asc(contentVocabs.ord));
  if (rows.length === 0) throw new ContentNotFoundError("content_vocabs");
  return rowsToVocabMeta(rows);
}
```

```ts
// src/lib/content/shadowing.ts — thay implementation, giữ types + chữ ký Task 5
import { asc, eq } from "drizzle-orm";
import { createDb } from "@/lib/db";
import {
  contentShadowingPlaylists,
  contentShadowingSubtitles,
  contentShadowingVideos,
} from "@/lib/db/schema";
import type {
  ShadowingPlaylist,
  ShadowingTopic,
  ShadowingVideo,
  SubtitleSentence,
} from "@/content/shadowing";
import { topicVi } from "@/content/shadowing";

export type { ShadowingPlaylist, ShadowingTopic, ShadowingVideo, SubtitleSentence };
export { topicVi };

export type SubtitlesByVideo = Record<string, SubtitleSentence[]>;

export class ContentNotFoundError extends Error {
  constructor(dataset: string) {
    super(`Content dataset rỗng hoặc chưa seed: ${dataset}`);
    this.name = "ContentNotFoundError";
  }
}

type VideoRow = ShadowingVideo & { ord: number };
type SubRow = { videoId: string; sentences: SubtitleSentence[] };

/* Pure function (test được): rows → shape app, sort ord, cast topic. */
export function rowsToShadowing(videoRows: VideoRow[], subRows: SubRow[]): { videos: ShadowingVideo[]; subtitles: SubtitlesByVideo } {
  const videos = [...videoRows]
    .sort((a, b) => a.ord - b.ord)
    .map(({ ord: _ord, ...v }) => ({ ...v, topic: v.topic as ShadowingTopic }));
  const subtitles: SubtitlesByVideo = {};
  for (const r of subRows) subtitles[r.videoId] = r.sentences;
  return { videos, subtitles };
}

export async function getShadowingPlaylists(): Promise<ShadowingPlaylist[]> {
  const rows = await createDb()
    .select()
    .from(contentShadowingPlaylists)
    .orderBy(asc(contentShadowingPlaylists.ord));
  if (rows.length === 0) throw new ContentNotFoundError("content_shadowing_playlists");
  return rows.map(({ ord: _ord, ...p }) => p);
}

export async function getShadowingVideos(): Promise<ShadowingVideo[]> {
  const rows = await createDb()
    .select()
    .from(contentShadowingVideos)
    .orderBy(asc(contentShadowingVideos.ord));
  if (rows.length === 0) throw new ContentNotFoundError("content_shadowing_videos");
  return rowsToShadowing(rows, []).videos;
}

export async function getShadowingSubtitles(): Promise<SubtitlesByVideo> {
  const rows = await createDb().select().from(contentShadowingSubtitles);
  if (rows.length === 0) throw new ContentNotFoundError("content_shadowing_subtitles");
  return rowsToShadowing([], rows).subtitles;
}

export async function getShadowingVideoById(id: string): Promise<ShadowingVideo | null> {
  const rows = await createDb()
    .select()
    .from(contentShadowingVideos)
    .where(eq(contentShadowingVideos.id, id));
  if (!rows[0]) return null;
  return rowsToShadowing([rows[0]], []).videos[0] ?? null;
}

export async function getShadowingSubtitlesByVideo(videoId: string): Promise<SubtitleSentence[] | null> {
  const rows = await createDb()
    .select()
    .from(contentShadowingSubtitles)
    .where(eq(contentShadowingSubtitles.videoId, videoId));
  return rows[0]?.sentences ?? null;
}
```

Lưu ý: drizzle `mode: "json"` tự parse JSON cột; nếu `rows[0].words` trả string (phiên bản drizzle), bọc `JSON.parse`. Chạy parity check ở Step 4 sẽ lộ.

- [ ] **Step 4: Run reshape tests + parity qua dev server**

Run: `pnpm vitest run src/lib/content/`
Expected: PASS (reshape + test static cũ `content-static.test.ts` phải vẫn PASS — nó gọi cùng facade, giờ đọc D1 local **qua** `createDb`... nếu test chạy ngoài Worker sẽ throw binding → đổi test này: giữ phần test đọc `@/content/*` trực tiếp (seed-source validation), chuyển các call facade trong file đó thành skip/describe.skip với chú thích "chạy lại qua e2e sau khi D1 swap").

Sau đó chạy dev server kiểm tra parity thật:
```bash
pnpm dev &
sleep 8
curl -s http://localhost:3100/api/v1/content/vocab | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const v=JSON.parse(d);console.log('books:',Object.keys(v).join(','));console.log('hsk1 lessons:',Object.keys(v.hsk1||{}).length)})"
curl -s http://localhost:3100/api/v1/content/shadowing | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const s=JSON.parse(d);console.log('playlists:',s.playlists.length,'videos:',s.videos.length,'subs:',Object.keys(s.subtitles).length)})"
```
Expected: 6 books; hsk1 15 lessons; 5 playlists; số videos/subs khớp static (~20 / ~4).
Dừng server sau khi kiểm tra.

- [ ] **Step 5: Verify toàn bộ + commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`
```bash
git add src/lib/content/
git commit -m "feat: content facade đọc D1 (vocab, shadowing) — parity với data static"
```

---

### Task 14: Server pages + API chuyển sang facade (dynamic)

**Files:**
- Modify: `src/app/(app)/lesson/[book]/[page]/page.tsx` (import + 2 chỗ đọc `vocab[book]?.[page]`)
- Modify: `src/app/(app)/shadowing/page.tsx` (import + thêm `dynamic`)
- Modify: `src/app/(app)/shadowing/[videoId]/page.tsx` (xóa `generateStaticParams`, thêm `dynamic`, đổi nguồn data)
- Modify: `src/app/api/v1/shadowing/progress/[videoId]/route.ts` (import `shadowingVideoById` → facade)
- Modify: test mock liên quan nếu có (grep Step 5)

**Interfaces:**
- Consumes: facade Task 13 (đang đọc D1).
- Produces: 4 route serve data thật từ D1; không route nào query D1 lúc build.

- [ ] **Step 1: Lesson page**

`src/app/(app)/lesson/[book]/[page]/page.tsx` — xóa `import { vocab } from "@/content/vocab";`, thêm:
```ts
import { getVocabLesson } from "@/lib/content/vocab";
```
Trong `generateMetadata` và `LessonPage`, thay `const lesson = vocab[book]?.[page];` bằng:
```ts
const lesson = await getVocabLesson(book, page);
```
(Route này không có `generateStaticParams` — đã dynamic sẵn; không cần thêm flag.)

- [ ] **Step 2: Shadowing pages**

`src/app/(app)/shadowing/page.tsx` — xóa import data từ `@/content/shadowing`; thêm:
```ts
import {
  getShadowingSubtitles,
  getShadowingVideos,
} from "@/lib/content/shadowing";

export const dynamic = "force-dynamic";
```
Thân `ShadowingPage`:
```ts
export default async function ShadowingPage() {
  const [videos, subtitlesByVideo] = await Promise.all([getShadowingVideos(), getShadowingSubtitles()]);
  return (
    <main>
      <ShadowingLibrary videos={videos} subtitlesByVideo={subtitlesByVideo} />
    </main>
  );
}
```
(Xóa comment "SSG thật" — không còn đúng.)

`src/app/(app)/shadowing/[videoId]/page.tsx` — xóa cả khối:
```ts
export function generateStaticParams() {
  return shadowingVideos.map((v) => ({ videoId: v.id }));
}
```
thêm `export const dynamic = "force-dynamic";`, đổi import sang facade, và trong page:
```ts
const video = await getShadowingVideoById(videoId);
if (!video) notFound();
const subs = (await getShadowingSubtitlesByVideo(video.id)) ?? FALLBACK_SUBS(video.durSec);
```
`generateMetadata` cũng đổi `shadowingVideoById(videoId)` → `await getShadowingVideoById(videoId)`.

- [ ] **Step 3: Shadowing progress API route**

`src/app/api/v1/shadowing/progress/[videoId]/route.ts` — đổi:
```ts
import { getShadowingVideoById } from "@/lib/content/shadowing";
// chỗ dùng: const video = await getShadowingVideoById(videoId);
```

- [ ] **Step 4: Kiểm tra runtime qua dev server**

```bash
pnpm dev &
sleep 8
curl -s -o /dev/null -w "lesson %{http_code}\n" http://localhost:3100/lesson/hsk1/lesson-1
curl -s -o /dev/null -w "shadowing %{http_code}\n" http://localhost:3100/shadowing
curl -s -o /dev/null -w "studio %{http_code}\n" "http://localhost:3100/shadowing/$(curl -s http://localhost:3100/api/v1/content/shadowing | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).videos[0].id))")"
curl -s -o /dev/null -w "lesson-404 %{http_code}\n" http://localhost:3100/lesson/hsk9/khong-co
```
Expected: 200, 200, 200, 404. Dừng server.

- [ ] **Step 5: Test + mock cleanup + commit**

Run: `grep -rln "shadowingVideoById\|content/shadowing" src/app/api src/app/\(app\)/shadowing src/lib/__tests__ | grep test`
Nếu test nào mock `@/content/shadowing` cho các route trên, đổi mock sang `@/lib/content/shadowing`.
Run: `pnpm typecheck && pnpm lint && pnpm test`
```bash
git add "src/app/(app)/lesson" "src/app/(app)/shadowing" src/app/api/v1/shadowing
git commit -m "feat: lesson/shadowing pages đọc content qua facade D1, chuyển force-dynamic"
```

---

### Task 15: E2E smoke + tài liệu seed + verification cuối

**Files:**
- Create: `e2e/content-d1.spec.ts`
- Modify: `README.md` (mục seed content D1)

**Interfaces:**
- Consumes: toàn bộ stack đã có; server preview (`pnpm preview` = opennextjs-cloudflare build + preview, chạy trên Worker thật với D1 local của wrangler).
- Produces: e2e chặn regression "quên chuyển dynamic" (build-time D1 query sẽ fail build preview); tài liệu seed cho máy mới.

- [ ] **Step 1: Viết e2e smoke**

Đọc `playwright.config.ts` trước để khớp `baseURL`/webServer hiện có. Spec:

```ts
// e2e/content-d1.spec.ts
import { expect, test } from "@playwright/test";

/* Smoke content D1 (plan dehardcode Pha 1) — chạy sau `pnpm preview`
   (Worker thật + D1 local đã seed). */

test.describe("content từ D1", () => {
  test("course hsk1 render danh sách bài", async ({ page }) => {
    await page.goto("/course/hsk1");
    await expect(page.getByRole("heading", { name: /HSK 1/ })).toBeVisible();
  });

  test("lesson hsk1/lesson-1 render từ vựng", async ({ page }) => {
    await page.goto("/lesson/hsk1/lesson-1");
    await expect(page.locator("body")).toContainText(/你好|nǐ hǎo/i);
  });

  test("shadowing library render video từ D1", async ({ page }) => {
    await page.goto("/shadowing");
    await expect(page.getByText("DaihuaXiyou").first()).toBeVisible();
  });

  test("lesson sai key trả 404", async ({ page }) => {
    const res = await page.goto("/lesson/hsk9/khong-co");
    expect(res?.status()).toBe(404);
  });
});
```
Nếu selector lệch UI thực tế (đọc trang khi chạy), điều chỉnh selector — ý nghĩa test là "trang render data từ D1, không trắng trang".

- [ ] **Step 2: Tài liệu seed**

`README.md` (app-next) — thêm mục:

```markdown
## Seed content D1

Sau khi pull migration mới, chạy để D1 local có data content (bắt buộc trước `pnpm dev`):

\`\`\`bash
pnpm dlx tsx scripts/seed/gen-vocab-seed.mts
pnpm dlx tsx scripts/seed/gen-shadowing-seed.mts
pnpm wrangler d1 migrations apply hsk --local
pnpm wrangler d1 execute hsk --local --file drizzle/seeds/content-vocabs.sql
pnpm wrangler d1 execute hsk --local --file drizzle/seeds/content-shadowing.sql
\`\`\`

Seed idempotent (INSERT OR REPLACE) — chạy lại an toàn. File SQL là sản phẩm của
script generator, không sửa tay.
```

- [ ] **Step 3: Chạy e2e + verification cuối**

```bash
pnpm test:e2e
```
(Playwright config hiện có tự dựng server — nếu config không có webServer, chạy `pnpm preview` ở terminal khác rồi `pnpm test:e2e`.)

Sau đó:
```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm preview   # build OpenNext phải thành công — chứng minh không query D1 lúc build
```
Expected: mọi lệnh sạch; build preview không lỗi binding.

- [ ] **Step 4: Commit**

```bash
git add e2e/content-d1.spec.ts README.md
git commit -m "test: e2e smoke content D1 + tài liệu seed content"
```

---

## self-review notes

- Spec coverage Pha 0: mục 1,2 (config) → Task 1–2; mục 3 (MOCK_ROWS) → Task 3; mục 4 (toneColors) → Task 4. ✅
- Spec coverage Pha 1: facade (§4.1) → Task 5, 13; schema (§4.2) → Task 11–12; API (§4.3) → Task 6; SSG→dynamic (§4.4) → Task 14; client consumers + error handling (`ContentNotFoundError`) → Task 7–10, 13. ✅
- Phần còn lại của spec (Pha 2: courses/roadmap/reading/dictionary/grammar; Pha 3: user_progress/leaderboard/review) là **plan riêng**, viết sau khi Pha 1 chạy ổn.
- Kiểm tra type consistency: chữ ký facade ở Task 5 = Task 13; `LessonIndexEntry`, `VocabMeta`, `vocabCharsFrom`, `resolveWord(key, vocabData)`, `buildQueue(..., vocabData)` nhất quán giữa các task.
