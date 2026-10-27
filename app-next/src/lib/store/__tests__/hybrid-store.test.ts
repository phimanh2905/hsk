/* HybridStore tests (Task 4 — spec 2026-10-24 Wave 4). jsdom localStorage +
   fake timers + fetch stub. Session điều khiển qua hybridOnAuthChange (Task 5
   sẽ nối useSession vào). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { progressStore as ProgressStoreApi } from "../progress-store";
import type {
  hybridMarkDirty,
  hybridMergeOnLogin,
  hybridOnAuthChange,
  hybridSyncNow,
  initHybridStore,
} from "../hybrid-store";

/* Module state (inited/loggedIn) là per-module — reset giữa các test để cô lập. */
let progressStore: typeof ProgressStoreApi;
let hybridMarkDirtyFn: typeof hybridMarkDirty;
let hybridMergeOnLoginFn: typeof hybridMergeOnLogin;
let hybridOnAuthChangeFn: typeof hybridOnAuthChange;
let hybridSyncNowFn: typeof hybridSyncNow;
let initHybridStoreFn: typeof initHybridStore;

const DIRTY_KEY = "bye.sync.dirty";
const TOMBSTONE_KEY = "bye.sync.tombstones";

type FetchMock = ReturnType<typeof vi.fn>;

let fetchMock: FetchMock;

function lastBody(): Record<string, unknown> {
  const call = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return JSON.parse(call[1].body as string);
}

/** Response mới mỗi lần gọi — cùng object bị đọc body 2 lần sẽ throw. */
function okRes(payload: Record<string, unknown> = { srs: [], studyDay: [], lessonProgress: [], reviewLogs: [], serverTime: 1 }) {
  return new Response(JSON.stringify(payload), { status: 200 });
}

function sse(key: string, over: Partial<Record<string, unknown>> = {}) {
  return {
    key,
    status: "known",
    dueAt: null,
    reviewCount: 1,
    lastReviewedAt: 1000,
    updatedAt: 1000,
    deletedAt: null,
    ...over,
  };
}

async function settle() {
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(async () => {
  vi.resetModules();
  const ps = await import("../progress-store");
  const hs = await import("../hybrid-store");
  progressStore = ps.progressStore;
  hybridMarkDirtyFn = hs.hybridMarkDirty;
  hybridMergeOnLoginFn = hs.hybridMergeOnLogin;
  hybridOnAuthChangeFn = hs.hybridOnAuthChange;
  hybridSyncNowFn = hs.hybridSyncNow;
  initHybridStoreFn = hs.initHybridStore;

  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-24T00:00:00Z"));
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("hybrid-store", () => {
  it("init + addXp → dirty studyDay, debounce 5s mới fetch /api/v1/sync", async () => {
    const cleanup = initHybridStoreFn();
    hybridOnAuthChangeFn(true);
    await settle(); // merge-on-login ban đầu
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ srs: [], studyDay: [], lessonProgress: [], serverTime: 1 }), { status: 200 })
    );

    progressStore.addXp(5);
    const dirty = JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}");
    expect(dirty.studyDay).toBe(1);

    await vi.advanceTimersByTimeAsync(4999);
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/sync");
    expect(init.method).toBe("POST");
    // sau flush thành công dirty cleared
    expect(JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}").studyDay).toBeUndefined();

    cleanup();
  });

  it("toggleSrs ON → dirty srs; toggle OFF → tombstone + payload deletedAt", async () => {
    initHybridStoreFn();
    hybridOnAuthChangeFn(true);
    await settle();
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ srs: [], studyDay: [], lessonProgress: [], serverTime: 1 }), { status: 200 })
    );

    expect(progressStore.toggleSrs("hsk1.a.1")).toBe(true);
    expect(JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}").srs).toBe(1);

    expect(progressStore.toggleSrs("hsk1.a.1")).toBe(false);
    const tombs = JSON.parse(localStorage.getItem(TOMBSTONE_KEY) || "{}");
    expect(typeof tombs.srs["hsk1.a.1"]).toBe("number");

    await vi.advanceTimersByTimeAsync(5000);
    const body = lastBody();
    const rec = (body.srs as Array<Record<string, unknown>>).find((r) => r.key === "hsk1.a.1");
    expect(rec).toBeTruthy();
    expect(typeof rec!.deletedAt).toBe("number");
  });

  it("toggle OFF → ON lại: tombstone bị xóa, payload item sống KHÔNG mang deletedAt", async () => {
    initHybridStoreFn();
    hybridOnAuthChangeFn(true);
    await settle();
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ srs: [], studyDay: [], lessonProgress: [], serverTime: 1 }), { status: 200 })
    );

    progressStore.toggleSrs("hsk1.a.9"); // ON
    progressStore.toggleSrs("hsk1.a.9"); // OFF → tombstone
    expect(typeof JSON.parse(localStorage.getItem(TOMBSTONE_KEY) || "{}").srs["hsk1.a.9"]).toBe("number");

    progressStore.toggleSrs("hsk1.a.9"); // ON lại
    expect(JSON.parse(localStorage.getItem(TOMBSTONE_KEY) || "{}").srs["hsk1.a.9"]).toBeUndefined();

    await vi.advanceTimersByTimeAsync(5000);
    const body = lastBody();
    const rec = (body.srs as Array<Record<string, unknown>>).find((r) => r.key === "hsk1.a.9");
    expect(rec).toBeTruthy();
    expect(rec!.deletedAt).toBeNull();
  });

  it("flush in-flight guard: 2 hybridSyncNow khi fetch chậm → chỉ 1 POST", async () => {
    initHybridStoreFn();
    hybridOnAuthChangeFn(true);
    await settle();
    fetchMock.mockClear();

    let resolveFetch!: (v: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((res) => (resolveFetch = res)));

    progressStore.addXp(1);
    const p1 = hybridSyncNowFn();
    const p2 = hybridSyncNowFn(); // cùng lúc flush đang chờ fetch
    resolveFetch(
      new Response(JSON.stringify({ srs: [], studyDay: [], lessonProgress: [], serverTime: 1 }), { status: 200 })
    );
    await Promise.all([p1, p2]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("payload compute: studyDay từ bye.heat với correct 0; srs từ getAllSrs", async () => {
    initHybridStoreFn();
    hybridOnAuthChangeFn(true);
    await settle();
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ srs: [], studyDay: [], lessonProgress: [], serverTime: 1 }), { status: 200 })
    );

    progressStore.addXp(7);
    progressStore.toggleSrs("hsk1.b.2");
    await vi.advanceTimersByTimeAsync(5000);

    const body = lastBody();
    const day = (body.studyDay as Array<Record<string, unknown>>)[0];
    expect(day.xp).toBe(7);
    expect(day.correct).toBe(0);
    const srs = (body.srs as Array<Record<string, unknown>>).find((r) => r.key === "hsk1.b.2");
    expect(srs).toBeTruthy();
  });

  it("response server merge ngược: updatedAt server mới hơn → local cập nhật; deletedAt mới hơn → xóa local + tombstone", async () => {
    const t0 = Date.now() - 10_000;
    localStorage.setItem(
      "bye.srs.items",
      JSON.stringify({
        "hsk1.c.3": { key: "hsk1.c.3", status: "new", dueAt: t0, reviewCount: 0, lastReviewedAt: null, updatedAt: t0 },
      })
    );
    initHybridStoreFn();
    hybridOnAuthChangeFn(true);
    await settle();
    fetchMock.mockClear();

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          srs: [
            sse("hsk1.c.3", { status: "known", updatedAt: Date.now(), reviewCount: 5 }),
            sse("hsk1.d.4", { deletedAt: Date.now(), updatedAt: Date.now(), status: "new" }),
          ],
          studyDay: [],
          lessonProgress: [],
          serverTime: 1,
        }),
        { status: 200 }
      )
    );

    progressStore.addXp(1);
    await vi.advanceTimersByTimeAsync(5000);

    const items = JSON.parse(localStorage.getItem("bye.srs.items") || "{}");
    // format 4 (W5.1): status cũ "known" được chuẩn hóa thành "review" (interval 21) khi store đọc/ghi lại
    expect(items["hsk1.c.3"].status).toBe("review");
    expect(items["hsk1.c.3"].intervalDays).toBe(21);
    expect(items["hsk1.c.3"].reviewCount).toBe(5);
    expect(items["hsk1.d.4"]).toBeUndefined();
    const tombs = JSON.parse(localStorage.getItem(TOMBSTONE_KEY) || "{}");
    expect(typeof tombs.srs["hsk1.d.4"]).toBe("number");
  });

  it("merge ngược có lesson/heat mới → listener bye:progress được gọi", async () => {
    localStorage.setItem("bye.heat", JSON.stringify({ "2026-10-20": 3 }));
    initHybridStoreFn();
    hybridOnAuthChangeFn(true);
    await settle();
    fetchMock.mockClear();

    const listener = vi.fn();
    window.addEventListener("bye:progress", listener);

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          srs: [],
          studyDay: [{ date: "2026-10-21", xp: 9, correct: 0, updatedAt: 1 }],
          lessonProgress: [
            { book: "hsk1", lesson: "5", modes: {}, knownCount: 2, updatedAt: Date.now(), deletedAt: null },
          ],
          serverTime: 1,
        }),
        { status: 200 }
      )
    );
    progressStore.addXp(1);
    await vi.advanceTimersByTimeAsync(5000);
    window.removeEventListener("bye:progress", listener);

    expect(listener).toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("bye.pageDone") || "{}")["hsk1/5"]).toBe(1);
    expect(JSON.parse(localStorage.getItem("bye.heat") || "{}")["2026-10-21"]).toBe(9);
  });

  it("flush trả 401 → dừng loggedIn, không retry POST; login lại → fetch tiếp", async () => {
    initHybridStoreFn();
    hybridOnAuthChangeFn(true);
    await settle();
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(new Response("unauthorized", { status: 401 }));

    progressStore.addXp(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // dirty giữ nguyên
    expect(JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}").studyDay).toBe(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1); // không retry

    // login lại → merge-push fetch tiếp
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ srs: [], studyDay: [], lessonProgress: [], serverTime: 1 }), { status: 200 })
    );
    hybridOnAuthChangeFn(false);
    hybridOnAuthChangeFn(true);
    await settle();
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it("guest: dirty tích tụ nhưng không bao giờ fetch", async () => {
    initHybridStoreFn();
    progressStore.addXp(3);
    hybridMarkDirtyFn("srs");
    expect(JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}").srs).toBe(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("login transition: merge-push toàn bộ local state rồi clear dirty; fetch fail giữ dirty", async () => {
    initHybridStoreFn();
    // guest mutations
    progressStore.addXp(4); // studyDay dirty
    progressStore.markPageDone("hsk1", "1"); // chưa dirty (guest vẫn đánh dirty — markPageDone patched)
    expect(JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}").studyDay).toBe(1);

    // login → merge-push toàn bộ (kể cả domain không dirty)
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ srs: [], studyDay: [], lessonProgress: [], serverTime: 1 }), { status: 200 })
    );
    hybridOnAuthChangeFn(true); // login transition → merge-push
    await settle();
    const body = lastBody();
    expect(body.studyDay).toBeTruthy();
    expect(body.lessonProgress).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}").studyDay).toBeUndefined();

    // fail → dirty giữ nguyên, không crash
    progressStore.addXp(2);
    fetchMock.mockRejectedValueOnce(new Error("network"));
    await hybridSyncNowFn();
    expect(JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}").studyDay).toBe(1);
  });

  it("debounce gom đợt: 5 mutate trong 1s → chỉ 1 fetch sau 5s", async () => {
    initHybridStoreFn();
    hybridOnAuthChangeFn(true);
    await settle();
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ srs: [], studyDay: [], lessonProgress: [], serverTime: 1 }), { status: 200 })
    );

    for (let i = 0; i < 5; i++) {
      progressStore.addXp(1);
      await vi.advanceTimersByTimeAsync(200);
    }
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("initHybridStore idempotent: init 2 lần vẫn chỉ patch 1 lớp", async () => {
    const cleanup = initHybridStoreFn();
    initHybridStoreFn();
    hybridOnAuthChangeFn(true);
    await settle();
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ srs: [], studyDay: [], lessonProgress: [], reviewLogs: [], serverTime: 1 }), { status: 200 })
    );
    progressStore.addXp(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("recordReview → dirty srs + studyDay + reviewLogs; payload reviewLogs đúng shape, studyDay.correct = 1", async () => {
    initHybridStoreFn();
    hybridOnAuthChangeFn(true);
    await settle();
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ srs: [], studyDay: [], lessonProgress: [], reviewLogs: [], serverTime: 1 }), { status: 200 })
    );

    progressStore.toggleSrs("hsk1.1.0"); // tạo item
    const NOW = Date.now();
    const out = progressStore.recordReview("hsk1.1.0", "good", NOW, 1500);
    expect(out).toBeTruthy();
    const dirty = JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}");
    expect(dirty.srs).toBe(1);
    expect(dirty.studyDay).toBe(1);
    expect(dirty.reviewLogs).toBe(1);

    await vi.advanceTimersByTimeAsync(5000);
    const body = lastBody();
    expect(body.reviewLogs).toEqual([
      { itemKey: "hsk1.1.0", cardType: "vocab", rating: 3, durationMs: 1500, reviewedAt: NOW },
    ]);
    const day = (body.studyDay as Array<Record<string, unknown>>).find((d) => d.date === "2026-10-24");
    expect(day).toBeTruthy();
    expect(day!.correct).toBe(1);
    // sau flush dirty cleared cả 3 domain
    const after = JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}");
    expect(after.reviewLogs).toBeUndefined();
    expect(after.srs).toBeUndefined();
  });

  it("item CHỈ có sau merge từ server → grade → payload phải chứa item với reviewCount mới", async () => {
    initHybridStoreFn();
    // flush merge-push lúc login: server trả về 1 srs item (pull)
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          srs: [sse("hsk1.lesson-1.0", { status: "learning", reviewCount: 0, updatedAt: 1000 })],
          studyDay: [],
          lessonProgress: [],
          reviewLogs: [],
          serverTime: 1,
        }),
        { status: 200 }
      )
    );
    hybridOnAuthChangeFn(true);
    await settle();
    // item đã vào localStorage nhờ merge
    const items = JSON.parse(localStorage.getItem("bye.srs.items") || "{}");
    expect(items["hsk1.lesson-1.0"]).toBeTruthy();

    fetchMock.mockClear();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ srs: [], studyDay: [], lessonProgress: [], reviewLogs: [], serverTime: 1 }), { status: 200 })
    );

    // user grade item vừa đến từ server
    const NOW = Date.now();
    expect(progressStore.recordReview("hsk1.lesson-1.0", "good", NOW, 500)).toBeTruthy();

    await vi.advanceTimersByTimeAsync(5000);
    const body = lastBody();
    const rec = (body.srs as Array<Record<string, unknown>>).find((r) => r.key === "hsk1.lesson-1.0");
    expect(rec).toBeTruthy();
    expect(rec!.reviewCount).toBe(1);
  });

  it("grade xảy ra TRONG LÚC flush đang bay → dirty không bị mất, flush sau gửi srs", async () => {
    initHybridStoreFn();
    // merge-push login: server trả item (pull)
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          srs: [sse("hsk1.lesson-1.0", { status: "learning", reviewCount: 0, updatedAt: 1000 })],
          studyDay: [],
          lessonProgress: [],
          reviewLogs: [],
          serverTime: 1,
        }),
        { status: 200 }
      )
    );
    hybridOnAuthChangeFn(true);
    await settle();

    // flush mới đang bay (fetch chậm) — giống case thật: sang trang mới → merge-push
    let resolveFetch!: (v: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>((res) => (resolveFetch = res)));
    hybridMarkDirtyFn("srs");
    const inflight = hybridSyncNowFn();

    // user grade TRONG LÚC POST đang bay
    const NOW = Date.now();
    expect(progressStore.recordReview("hsk1.lesson-1.0", "good", NOW, 500)).toBeTruthy();

    resolveFetch(
      new Response(JSON.stringify({ srs: [], studyDay: [], lessonProgress: [], reviewLogs: [], serverTime: 1 }), { status: 200 })
    );
    await inflight;

    // flush kế tiếp (debounce) phải đưa item có reviewCount mới lên server
    await vi.advanceTimersByTimeAsync(5000);
    const body = lastBody();
    const rec = (body.srs as Array<Record<string, unknown>>).find((r) => r.key === "hsk1.lesson-1.0");
    expect(rec).toBeTruthy();
    expect(rec!.reviewCount).toBe(1);
  });

  it("server trả log trùng khóa (itemKey, reviewedAt) → local không đúp; log mới từ server được thêm", async () => {
    const NOW = Date.now() - 5000;
    progressStore.toggleSrs("hsk1.1.0");
    progressStore.recordReview("hsk1.1.0", "good", NOW, 100);
    initHybridStoreFn();
    hybridOnAuthChangeFn(true);
    await settle();
    fetchMock.mockClear();

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          srs: [],
          studyDay: [],
          lessonProgress: [],
          reviewLogs: [
            { itemKey: "hsk1.1.0", cardType: "vocab", rating: 4, durationMs: 999, reviewedAt: NOW }, // trùng khóa
            { itemKey: "hsk1.1.9", cardType: "grammar", rating: 2, durationMs: 42, reviewedAt: NOW + 1 }, // mới
          ],
          serverTime: 1,
        }),
        { status: 200 }
      )
    );
    progressStore.addXp(1);
    await vi.advanceTimersByTimeAsync(5000);

    const logs = JSON.parse(localStorage.getItem("bye.review.logs") || "[]") as Array<Record<string, unknown>>;
    expect(logs.filter((l) => l.itemKey === "hsk1.1.0" && l.reviewedAt === NOW)).toHaveLength(1);
    // append-only: bản local giữ nguyên, không bị server ghi đè field-wise
    expect(logs.find((l) => l.itemKey === "hsk1.1.0")!.durationMs).toBe(100);
    expect(logs.find((l) => l.itemKey === "hsk1.1.9")).toBeTruthy();
  });

  it("reviewLogs > 1000: flush 1 gửi 1000 OLDEST (không gửi 50 newest) → dirty còn; flush 2 gửi 50 còn lại → clear; KHÔNG flush 3", async () => {
    initHybridStoreFn();
    hybridOnAuthChangeFn(true);
    await settle();
    fetchMock.mockClear();
    fetchMock.mockImplementation(() => Promise.resolve(okRes()));

    // ghi 1050 log trực tiếp localStorage (cap store 2000 nên không bị cắt)
    const logs = [];
    for (let i = 0; i < 1050; i++) {
      logs.push({ cardType: "vocab", itemKey: `k${i}`, rating: 3, durationMs: 1, reviewedAt: 1000 + i });
    }
    localStorage.setItem("bye.review.logs", JSON.stringify(logs));
    hybridMarkDirtyFn("reviewLogs");

    // flush 1: 1000 oldest (k0..k999), KHÔNG chứa 50 newest
    await vi.advanceTimersByTimeAsync(5000);
    const body1 = lastBody();
    const sent1 = body1.reviewLogs as Array<Record<string, unknown>>;
    expect(sent1).toHaveLength(1000);
    expect(sent1[0].itemKey).toBe("k0"); // oldest-first
    expect(sent1[999].itemKey).toBe("k999");
    expect(sent1.find((l) => l.itemKey === "k1049")).toBeUndefined();
    // còn 50 entry chưa gửi → reviewLogs vẫn dirty
    expect(JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}").reviewLogs).toBe(1);

    // flush 2: 50 còn lại (k1000..k1049)
    fetchMock.mockClear();
    await vi.advanceTimersByTimeAsync(5000);
    const sent2 = lastBody().reviewLogs as Array<Record<string, unknown>>;
    expect(sent2).toHaveLength(50);
    expect(sent2[0].itemKey).toBe("k1000");
    expect(sent2[49].itemKey).toBe("k1049");
    expect(JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}").reviewLogs).toBeUndefined();

    // flush 3: không còn log chưa gửi → không POST nữa
    fetchMock.mockClear();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("merge ngược server logs cũ hơn con trỏ → không bị gửi lại; payload rỗng vẫn clear dirty", async () => {
    initHybridStoreFn();
    hybridOnAuthChangeFn(true);
    await settle();
    fetchMock.mockClear();

    // flush đầu: gửi 1 log mới (reviewedAt = NOW) → con trỏ = NOW
    const NOW = Date.now();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ srs: [], studyDay: [], lessonProgress: [], reviewLogs: [], serverTime: 1 }), { status: 200 })
    );
    progressStore.toggleSrs("hsk1.1.0");
    progressStore.recordReview("hsk1.1.0", "good", NOW, 100);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}").reviewLogs).toBeUndefined();

    // server trả log CŨ hơn con trỏ (đồng bộ chéo thiết bị) → merge vào local
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        okRes({
          srs: [],
          studyDay: [],
          lessonProgress: [],
          reviewLogs: [{ itemKey: "hsk1.old.1", cardType: "vocab", rating: 2, durationMs: 5, reviewedAt: NOW - 60_000 }],
          serverTime: 1,
        })
      )
    );
    hybridMarkDirtyFn("reviewLogs"); // đánh dirty lại để xem payload lần flush tới
    await vi.advanceTimersByTimeAsync(5000);
    // log cũ hơn con trỏ KHÔNG được gửi lại
    expect(lastBody().reviewLogs).toEqual([]);
    expect(JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}").reviewLogs).toBeUndefined();
  });
});
