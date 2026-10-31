import { describe, it, expect } from "vitest";
import { Router } from "@/worker/router";
import { json } from "@/server/api/json";

const req = (path: string, method = "GET") =>
  new Request(`http://x.test${path}`, { method });

describe("Router", () => {
  it("route exact", async () => {
    const r = new Router();
    r.get("/api/v1/content/vocab", () => json({ ok: 1 }));
    const res = await r.handle(req("/api/v1/content/vocab"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: 1 });
  });

  it("route :param + method khác nhau", async () => {
    const r = new Router();
    r.get("/api/v1/notebook/entries/:id", (_q, p) => json({ id: p.id }));
    r.delete("/api/v1/notebook/entries/:id", () => json({ deleted: true }));
    expect(((await r.handle(req("/api/v1/notebook/entries/abc"))) as Response).status).toBe(200);
    expect(await (await r.handle(req("/api/v1/notebook/entries/abc", "DELETE"))).json())
      .toEqual({ deleted: true });
  });

  it("wildcard cuối * (auth catch-all) + decodeURIComponent param", async () => {
    const r = new Router();
    r.all("/api/v1/auth/*", () => json({ auth: true }));
    const res = await r.handle(req("/api/v1/auth/get-session"));
    expect(res.status).toBe(200);
  });

  it("404 JSON cho path không khớp, 500 khi handler throw", async () => {
    const r = new Router();
    r.get("/boom", () => { throw new Error("x"); });
    expect((await r.handle(req("/nope"))).status).toBe(404);
    expect((await r.handle(req("/boom"))).status).toBe(500);
  });
});
