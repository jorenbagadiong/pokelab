import { describe, expect, it, vi } from "vitest";
import { fetchJson, resolveApiUrl } from "./client";
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
