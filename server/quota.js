// Shared rolling-window quota reservations. Failed provider calls are not refunded.
export function limitsFromEnv(env = process.env) {
  const number = (name, fallback, max) => {
    const n = Number(env[name] ?? fallback);
    if (!Number.isInteger(n) || n < 1 || n > max)
      throw new Error("Invalid quota configuration");
    return n;
  };
  return {
    rpm: number("AI_REQUESTS_PER_MINUTE", 1, 10),
    rpd: number("AI_REQUESTS_PER_DAY", 10, 1000),
    tpm: number("AI_INPUT_BUDGET_PER_MINUTE", 12000, 1000000),
  };
}
export function reserveState(state, now, tokens, limits) {
  state.events = state.events.filter((e) => e.at > now - 86400000);
  if (tokens > limits.tpm)
    return {
      allowed: false,
      status: 400,
      retryAfter: 0,
      reason:
        "These notes exceed the app’s input budget. Shorten them and try again.",
    };
  if (state.cooldownUntil > now)
    return {
      allowed: false,
      status: 429,
      retryAfter: Math.ceil((state.cooldownUntil - now) / 1000),
      reason:
        "The AI service is cooling down. Please wait before trying again.",
    };
  const recent = state.events.filter((e) => e.at > now - 60000);
  let until = 0;
  if (state.events.length >= limits.rpd) until = state.events[0].at + 86400000;
  const last = state.events.at(-1);
  if (last) until = Math.max(until, last.at + Math.ceil(60000 / limits.rpm));
  if (recent.length >= limits.rpm)
    until = Math.max(until, recent[0].at + 60000);
  if (recent.reduce((sum, e) => sum + e.tokens, 0) + tokens > limits.tpm)
    until = Math.max(until, recent[0].at + 60000);
  if (until > now)
    return {
      allowed: false,
      status: 429,
      retryAfter: Math.ceil((until - now) / 1000),
      reason:
        "The app’s shared AI allowance is temporarily used up. Your notes are safe; try again after the wait.",
    };
  state.events.push({ at: now, tokens });
  return { allowed: true };
}
export function createMemoryStore(clock = Date.now) {
  const state = { events: [], cooldownUntil: 0 };
  return {
    async reserve(tokens, limits) {
      return reserveState(state, clock(), tokens, limits);
    },
    async cooldown(seconds) {
      state.cooldownUntil = Math.max(
        state.cooldownUntil,
        clock() + seconds * 1000,
      );
    },
  };
}
// Redis executes the entire read/check/reserve operation atomically, across instances.
export const QUOTA_SCRIPT = `
local nowParts = redis.call('TIME')
local now = tonumber(nowParts[1])*1000 + math.floor(tonumber(nowParts[2])/1000)
local raw = redis.call('GET',KEYS[1])
local state = raw and cjson.decode(raw) or {events={},cooldownUntil=0}
local events = {}
for _,event in ipairs(state.events) do if event.at > now-86400000 then table.insert(events,event) end end
state.events=events
if ARGV[1]=='cooldown' then
 state.cooldownUntil=math.max(state.cooldownUntil,now+tonumber(ARGV[2])*1000)
 redis.call('SET',KEYS[1],cjson.encode(state),'PX',172800000)
 return {1,0}
end
local tokens,rpm,rpd,tpm=tonumber(ARGV[2]),tonumber(ARGV[3]),tonumber(ARGV[4]),tonumber(ARGV[5])
if tokens>tpm then return {-1,0} end
if state.cooldownUntil>now then return {0,math.ceil((state.cooldownUntil-now)/1000)} end
local recentCount,recentTokens,firstRecent=0,0,0
for _,event in ipairs(events) do
 if event.at>now-60000 then
  recentCount=recentCount+1
  recentTokens=recentTokens+event.tokens
  if firstRecent==0 then firstRecent=event.at end
 end
end
local untilTime=0
if #events>=rpd then untilTime=events[1].at+86400000 end
if #events>0 then untilTime=math.max(untilTime,events[#events].at+math.ceil(60000/rpm)) end
if recentCount>=rpm or recentTokens+tokens>tpm then untilTime=math.max(untilTime,firstRecent+60000) end
if untilTime>now then return {0,math.ceil((untilTime-now)/1000)} end
table.insert(state.events,{at=now,tokens=tokens})
redis.call('SET',KEYS[1],cjson.encode(state),'PX',172800000)
return {1,0}
`;
export function createRedisStore({
  url,
  token,
  namespace = "briefly:quota:v1",
  fetcher = fetch,
}) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  )
    throw new Error("Invalid Redis endpoint");
  async function run(args) {
    const response = await fetcher(parsed.origin, {
      method: "POST",
      signal: AbortSignal.timeout(2500),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        "EVAL",
        QUOTA_SCRIPT,
        "1",
        namespace,
        ...args.map(String),
      ]),
    });
    if (!response.ok) throw new Error("Quota storage unavailable");
    const data = await response.json();
    if (
      data.error ||
      !Array.isArray(data.result) ||
      data.result.length !== 2 ||
      !data.result.every(Number.isFinite)
    )
      throw new Error("Invalid quota storage response");
    return data.result;
  }
  return {
    async reserve(tokens, limits) {
      const [allowed, retryAfter] = await run([
        "reserve",
        tokens,
        limits.rpm,
        limits.rpd,
        limits.tpm,
      ]);
      if (![1, 0, -1].includes(allowed))
        throw new Error("Invalid quota decision");
      return {
        allowed: allowed === 1,
        status: allowed === -1 ? 400 : 429,
        retryAfter,
        reason:
          allowed === -1
            ? "These notes exceed the app’s input budget. Shorten them and try again."
            : "The app’s shared AI allowance is temporarily used up. Your notes are safe; try again after the wait.",
      };
    },
    async cooldown(seconds) {
      await run(["cooldown", seconds]);
    },
  };
}
const localStore = createMemoryStore();
export function getQuotaStore(env = process.env) {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)
    return createRedisStore({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
      namespace: env.AI_QUOTA_NAMESPACE || "briefly:quota:v1",
    });
  if (env.VERCEL || env.NODE_ENV === "production")
    throw new Error("Shared quota storage required");
  return localStore;
}
// A deliberately high byte-based estimate includes prompt/schema overhead. It is
// an app budget, not Google's tokenizer; provider limits still take precedence.
export function inputBudget(notes) {
  return (
    Buffer.byteLength(JSON.stringify({ meetingNotes: notes }), "utf8") + 4096
  );
}
