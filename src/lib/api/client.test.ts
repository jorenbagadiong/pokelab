import { describe, expect, it, vi } from "vitest";
import { fetchJson, resolveApiUrl, retryDelay } from "./client";
import { ApiError, NotFoundError } from "./errors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("resolveApiUrl", () => {
  it("builds PokéAPI URLs and refuses other hosts", () => {
    expect(resolveApiUrl("/pokemon/1")).toBe("https://pokeapi.co/api/v2/pokemon/1");
    expect(resolveApiUrl("type/fire")).toBe("https://pokeapi.co/api/v2/type/fire");
    expect(resolveApiUrl("https://pokeapi.co/api/v2/evolution-chain/1/")).toBe("https://pokeapi.co/api/v2/evolution-chain/1/");
    expect(() => resolveApiUrl("https://example.com/api")).toThrow(ApiError);
  });
});

describe("fetchJson", () => {
  it("returns parsed JSON on success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ id: 1 }));
    await expect(fetchJson("/pokemon/1", { fetchImpl })).resolves.toEqual({ id: 1 });
    expect(fetchImpl).toHaveBeenCalledWith("https://pokeapi.co/api/v2/pokemon/1", expect.objectContaining({ headers: { Accept: "application/json" } }));
  });

  it("throws NotFoundError for 404 without retrying", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("Not Found", { status: 404 }));
    await expect(fetchJson("/pokemon/notapokemon", { fetchImpl })).rejects.toBeInstanceOf(NotFoundError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries transient server errors, then succeeds", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response("", { status: 503 })).mockResolvedValueOnce(json({ ok: true }));
    await expect(fetchJson("/pokemon/1", { fetchImpl, retries: 1 })).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("surfaces an ApiError with the status after retries are exhausted", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 500 }));
    const error = await fetchJson("/pokemon/1", { fetchImpl, retries: 1 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).not.toBeInstanceOf(NotFoundError);
    expect((error as ApiError).status).toBe(500);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-transient client errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 400 }));
    await expect(fetchJson("/pokemon/1", { fetchImpl })).rejects.toMatchObject({ status: 400 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("wraps network failures", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    await expect(fetchJson("/pokemon/1", { fetchImpl, retries: 0 })).rejects.toThrow(/Network error.*fetch failed/);
  });

  it("rejects invalid JSON bodies", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("<html>", { status: 200 }));
    await expect(fetchJson("/pokemon/1", { fetchImpl })).rejects.toThrow(/invalid JSON/);
  });
});

describe("fetchJson resilience", () => {
  it("retries a request that times out or stalls, then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("The operation timed out.", "TimeoutError"))
      .mockResolvedValueOnce(json({ id: 25 }));
    await expect(fetchJson("/pokemon/25", { fetchImpl })).resolves.toEqual({ id: 25 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("retries 429 responses, honouring Retry-After", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 429, headers: { "Retry-After": "0" } }))
      .mockResolvedValueOnce(json({ ok: true }));
    await expect(fetchJson("/pokemon/1", { fetchImpl })).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("limits concurrent requests", async () => {
    let inFlight = 0;
    let peak = 0;
    const fetchImpl = vi.fn(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 10));
      inFlight--;
      return json({});
    });
    await Promise.all(Array.from({ length: 30 }, (_, i) => fetchJson(`/pokemon/${i + 1}`, { fetchImpl })));
    expect(fetchImpl).toHaveBeenCalledTimes(30);
    expect(peak).toBeLessThanOrEqual(8);
  });
});

describe("retryDelay", () => {
  it("backs off exponentially with jitter", () => {
    const first = retryDelay(0);
    const second = retryDelay(1);
    expect(first).toBeGreaterThanOrEqual(400);
    expect(first).toBeLessThan(800);
    expect(second).toBeGreaterThanOrEqual(800);
    expect(second).toBeLessThan(1200);
  });

  it("honours Retry-After but caps it", () => {
    expect(retryDelay(0, "2")).toBe(2000);
    expect(retryDelay(0, "120")).toBe(5000);
    expect(retryDelay(0, "soon")).toBeGreaterThanOrEqual(400);
  });
});
