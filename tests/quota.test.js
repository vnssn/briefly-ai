import { describe, it, expect, vi } from "vitest";
import {
  createMemoryStore,
  createRedisStore,
  getQuotaStore,
  limitsFromEnv,
  inputBudget,
  reserveState,
  QUOTA_SCRIPT,
} from "../server/quota.js";
import { createBrief } from "../api/brief.js";
import { SAMPLE_NOTES, SAMPLE_BRIEF } from "../src/brief.js";
const limits = { rpm: 1, rpd: 10, tpm: 12000 };
describe("rolling quota budgets", () => {
  it("reserves atomically under concurrent callers", async () => {
    const store = createMemoryStore(() => 100000);
    const results = await Promise.all(
      Array.from({ length: 20 }, () => store.reserve(100, limits)),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(1);
    expect(results[1].retryAfter).toBe(60);
  });
  it("allows exactly at minute expiry", async () => {
    let now = 100000;
    const store = createMemoryStore(() => now);
    await store.reserve(100, limits);
    now += 59999;
    expect((await store.reserve(100, limits)).allowed).toBe(false);
    now++;
    expect((await store.reserve(100, limits)).allowed).toBe(true);
  });
  it("enforces a daily budget across rolling 24 hours", async () => {
    let now = 100000;
    const store = createMemoryStore(() => now);
    for (let i = 0; i < 10; i++) {
      expect((await store.reserve(100, limits)).allowed).toBe(true);
      now += 60000;
    }
    expect((await store.reserve(100, limits)).allowed).toBe(false);
    now = 86500000;
    expect((await store.reserve(100, limits)).allowed).toBe(true);
  });
  it("enforces input budget and refuses oversize without consuming quota", async () => {
    const store = createMemoryStore(() => 100000);
    expect((await store.reserve(12001, limits)).status).toBe(400);
    expect((await store.reserve(100, limits)).allowed).toBe(true);
  });
  it("limits aggregate input and enforces spacing when configured RPM exceeds one", () => {
    const state = { events: [{ at: 100000, tokens: 8000 }], cooldownUntil: 0 };
    expect(
      reserveState(state, 130000, 5000, { ...limits, rpm: 2 }).allowed,
    ).toBe(false);
    expect(
      reserveState(state, 160000, 5000, { ...limits, rpm: 2 }).allowed,
    ).toBe(true);
  });
  it("never shortens an existing cooldown", async () => {
    let now = 100000;
    const store = createMemoryStore(() => now);
    await store.cooldown(3600);
    await store.cooldown(60);
    expect((await store.reserve(100, limits)).retryAfter).toBe(3600);
    now += 3600000;
    expect((await store.reserve(100, limits)).allowed).toBe(true);
  });
  it("bounds configuration and counts multibyte inputs conservatively", () => {
    expect(limitsFromEnv({})).toEqual(limits);
    expect(() => limitsFromEnv({ AI_REQUESTS_PER_MINUTE: "0" })).toThrow();
    expect(() => limitsFromEnv({ AI_REQUESTS_PER_DAY: "50000" })).toThrow();
    expect(inputBudget("ह")).toBeGreaterThan(inputBudget("a"));
  });
  it("fails closed in production without shared storage", () => {
    expect(() => getQuotaStore({ VERCEL: "1" })).toThrow();
    expect(() => getQuotaStore({ NODE_ENV: "production" })).toThrow();
    expect(getQuotaStore({})).toHaveProperty("reserve");
  });
});
describe("shared Redis boundary", () => {
  it("uses one atomic server-timed Lua request with an expiring record", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ result: [1, 0] }) });
    const store = createRedisStore({
      url: "https://redis.example",
      token: "private-test-token",
      fetcher,
    });
    expect((await store.reserve(100, limits)).allowed).toBe(true);
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.slice(0, 4)).toEqual([
      "EVAL",
      QUOTA_SCRIPT,
      "1",
      "briefly:quota:v1",
    ]);
    expect(QUOTA_SCRIPT).toContain("redis.call('TIME')");
    expect(QUOTA_SCRIPT).toContain("172800000");
    await store.cooldown(60);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("interprets shared rejections and oversize decisions", async () => {
    for (const [code, status] of [
      [0, 429],
      [-1, 400],
    ]) {
      const store = createRedisStore({
        url: "https://redis.example",
        token: "test",
        fetcher: async () => ({
          ok: true,
          json: async () => ({ result: [code, 60] }),
        }),
      });
      expect((await store.reserve(100, limits)).status).toBe(status);
    }
  });
  it("rejects insecure endpoints, failed requests and invalid responses", async () => {
    expect(() =>
      createRedisStore({ url: "http://redis.example", token: "test" }),
    ).toThrow();
    for (const response of [
      { ok: false },
      { ok: true, json: async () => ({ error: "bad" }) },
      { ok: true, json: async () => ({ result: [4, 0] }) },
    ]) {
      const store = createRedisStore({
        url: "https://redis.example",
        token: "test",
        fetcher: async () => response,
      });
      await expect(store.reserve(100, limits)).rejects.toThrow();
    }
  });
});
describe("provider quota protection", () => {
  it("does not call the provider after a local budget rejection or storage outage", async () => {
    const fetcher = vi.fn();
    for (const reserve of [
      async () => ({
        allowed: false,
        status: 429,
        retryAfter: 60,
        reason: "Wait",
      }),
      async () => {
        throw new Error("offline");
      },
    ]) {
      const result = await createBrief(SAMPLE_NOTES, {
        key: "test",
        fetcher,
        quotaStore: { reserve },
      });
      expect([429, 503]).toContain(result.status);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("honors a Groq daily token limit and does not automatically retry", async () => {
    const cooldown = vi.fn();
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: {
          message:
            "Rate limit reached for model `openai/gpt-oss-120b` on tokens per day (TPD): Limit 200000, Used 200000, Requested 1500. Please try again in 2m5.4s.",
          type: "tokens",
        },
      }),
    });
    const result = await createBrief(SAMPLE_NOTES, {
      key: "test",
      fetcher,
      quotaStore: { reserve: async () => ({ allowed: true }), cooldown },
    });
    expect(result.body.retryAfter).toBe(86400);
    expect(cooldown).toHaveBeenCalledWith(86400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("pauses for daily quota exhaustion and respects Retry-After", async () => {
    for (const [response, expected] of [
      [
        {
          ok: false,
          status: 429,
          json: async () => ({
            error: {
              message:
                "Rate limit reached for model `openai/gpt-oss-120b` on requests per day (RPD): Limit 1000, Used 1000, Requested 1.",
              type: "requests",
            },
          }),
        },
        86400,
      ],
      [
        {
          ok: false,
          status: 503,
          headers: { get: () => "180" },
          json: async () => ({}),
        },
        180,
      ],
    ]) {
      const cooldown = vi.fn();
      const result = await createBrief(SAMPLE_NOTES, {
        key: "test",
        fetcher: async () => response,
        quotaStore: { reserve: async () => ({ allowed: true }), cooldown },
      });
      expect(result.body.retryAfter).toBe(expected);
      expect(cooldown).toHaveBeenCalledWith(expected);
    }
  });
  it("counts failed calls toward the shared allowance", async () => {
    let now = 100000;
    const store = createMemoryStore(() => now);
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await createBrief(SAMPLE_NOTES, {
      key: "test",
      fetcher,
      quotaStore: store,
    });
    await createBrief(SAMPLE_NOTES, {
      key: "test",
      fetcher,
      quotaStore: store,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

it("accepts the environment names created by the Vercel Upstash integration", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ result: [1, 0] }) });
  vi.stubGlobal("fetch", fetcher);
  const store = getQuotaStore({
    VERCEL: "1",
    KV_REST_API_URL: "https://redis.example",
    KV_REST_API_TOKEN: "test-integration-token",
  });
  expect((await store.reserve(100, limits)).allowed).toBe(true);
  expect(fetcher).toHaveBeenCalledWith(
    "https://redis.example",
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: "Bearer test-integration-token",
      }),
    }),
  );
});
