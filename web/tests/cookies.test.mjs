// 실행: node --test tests/cookies.test.mjs
// 쿠키 예약·차감·환불과 모의 충전을 검사한다. 실계정·키·AI 호출 없음.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server.js";

const root = fileURLToPath(new URL("../src", import.meta.url));
const cache = new Map();
const stubs = new Map([["next/server", { NextRequest, NextResponse }]]);
function load(relative) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = (name) => {
    if (stubs.has(name)) return stubs.get(name);
    if (name.startsWith(".")) return load(path.resolve(path.dirname(filename), `${name}.ts`));
    return original(name);
  };
  cache.set(filename, mod);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return mod.exports;
}
const { emptyCounts, seoulDay } = load("lib/ai-usage.ts");
const { reserveUsage, settleUsage, usageSummary } = load("lib/ai-usage-store.ts");
const { mockPurchase, walletSummary } = load("lib/cookie-store.ts");
const { COOKIE_PACKS, canUseCookie, readWallet } = load("lib/cookies.ts");

function database() {
  const docs = new Map();
  let queue = Promise.resolve();
  return {
    docs,
    doc: (key) => ({ key, get: async () => ({ data: () => structuredClone(docs.get(key)) }) }),
    runTransaction(fn) {
      const run = queue.then(() => fn({
        get: async (ref) => ({ data: () => structuredClone(docs.get(ref.key)) }),
        set: (ref, value) => docs.set(ref.key, structuredClone(value)),
      }));
      queue = run.catch(() => {});
      return run;
    },
    collection(prefix) {
      const query = {
        where() { return query; },
        async get() {
          return { docs: [...docs].filter(([key]) => key.startsWith(`${prefix}/`)).map(([key, value]) => ({ id: key.split("/").at(-1), data: () => structuredClone(value) })) };
        },
      };
      return query;
    },
  };
}

const now = new Date("2026-11-04T01:00:00Z");
const day = seoulDay(now);
const WALLET = "users/alice/wallet/cookies";

// 오늘 무료 횟수를 다 쓴 상태로 만든다.
function exhausted(balance = 0) {
  const db = database();
  db.docs.set(`users/alice/usage/${day}`, { counts: { ...emptyCounts(), exam: 20 }, pending: {} });
  if (balance > 0) db.docs.set(WALLET, { balance, pending: {} });
  return db;
}

test("무료 횟수가 남아 있으면 쿠키를 쓰지 않는다", async () => {
  const db = database();
  db.docs.set(WALLET, { balance: 3, pending: {} });
  const lease = await reserveUsage(db, "alice", "exam", now);
  assert.equal(lease.paid, false);
  await settleUsage(db, lease, true);
  assert.equal(db.docs.get(WALLET).balance, 3);
});

test("무료 횟수를 다 쓰고 쿠키가 없으면 429이고 충전을 안내한다", async () => {
  await assert.rejects(() => reserveUsage(exhausted(), "alice", "exam", now), (error) => {
    assert.equal(error.status, 429);
    assert.match(error.message, /쿠키/);
    return true;
  });
});

test("AI가 성공하면 쿠키 1개를 빼고 사용량에 더한다, 다시 실행해도 한 번만", async () => {
  const db = exhausted(2);
  const lease = await reserveUsage(db, "alice", "exam", now);
  assert.equal(lease.paid, true);
  assert.equal(db.docs.get(WALLET).balance, 2); // 예약만, 아직 안 뺐다
  assert.equal((await walletSummary(db, "alice", now)).available, 1);
  await settleUsage(db, lease, true);
  await settleUsage(db, lease, true);
  const wallet = db.docs.get(WALLET);
  assert.equal(wallet.balance, 1);
  assert.deepEqual(wallet.pending, {});
  const summary = await usageSummary(db, "alice", now);
  assert.equal(summary.usedToday, 21);
  assert.equal(summary.remaining, 0);
});

test("AI가 실패하면 쿠키를 빼지 않는다", async () => {
  const db = exhausted(1);
  const lease = await reserveUsage(db, "alice", "mail", now);
  await settleUsage(db, lease, false);
  assert.equal(db.docs.get(WALLET).balance, 1);
  assert.deepEqual(db.docs.get(WALLET).pending, {});
  assert.equal((await usageSummary(db, "alice", now)).usedToday, 20);
});

test("쿠키 1개로 동시에 여러 번 요청해도 1번만 예약된다", async () => {
  const db = exhausted(1);
  const results = await Promise.allSettled([1, 2, 3].map(() => reserveUsage(db, "alice", "exam", now)));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
});

test("서버가 끊겨 만료된 예약은 쿠키를 묶어 두지 않고 빼지도 않는다", async () => {
  const db = exhausted(1);
  await reserveUsage(db, "alice", "exam", now);
  const later = new Date(now.getTime() + 121_000);
  assert.equal((await walletSummary(db, "alice", later)).available, 1);
  const again = await reserveUsage(db, "alice", "exam", later);
  assert.equal(again.paid, true);
  await settleUsage(db, again, true);
  assert.equal(db.docs.get(WALLET).balance, 0);
});

test("자동으로 불리는 브리핑은 쿠키를 쓰지 않고, 무료 쿠키를 다 써도 따로 받는다", async () => {
  assert.equal(canUseCookie("briefing"), false);
  assert.equal(canUseCookie("exam"), true);
  const db = exhausted(5);
  const lease = await reserveUsage(db, "alice", "briefing", now);
  assert.equal(lease.paid, false);
  await settleUsage(db, lease, true);
  assert.equal(db.docs.get(WALLET).balance, 5);
  assert.deepEqual(db.docs.get(WALLET).pending, {});
});

test("브리핑은 무료 쿠키를 줄이지 않는다", async () => {
  const db = database();
  for (let i = 0; i < 3; i++) await settleUsage(db, await reserveUsage(db, "alice", "briefing", now), true);
  const summary = await usageSummary(db, "alice", now);
  assert.equal(summary.todayCounts.briefing, 3);
  assert.equal(summary.remaining, 20);
  assert.equal((await walletSummary(db, "alice", now)).free, 20);
});

test("브리핑은 하루 5번에서 막히고, 그래도 무료 쿠키는 그대로 쓴다", async () => {
  const { BRIEFING_DAILY_LIMIT } = load("lib/ai-usage.ts");
  const db = database();
  const results = await Promise.allSettled(Array.from({ length: BRIEFING_DAILY_LIMIT + 1 }, () => reserveUsage(db, "alice", "briefing", now)));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, BRIEFING_DAILY_LIMIT);
  assert.match(results.find((r) => r.status === "rejected").reason.message, /브리핑/);
  const exam = await reserveUsage(db, "alice", "exam", now);
  assert.equal(exam.paid, false);
});

test("쿠키 칸은 남은 무료 쿠키와 충전한 쿠키를 따로 준다", async () => {
  const db = database();
  db.docs.set(`users/alice/usage/${day}`, { counts: { ...emptyCounts(), exam: 5, briefing: 2 }, pending: {} });
  db.docs.set(WALLET, { balance: 3, pending: {} });
  const summary = await walletSummary(db, "alice", now);
  assert.equal(summary.free, 15);
  assert.equal(summary.balance, 3);
  const bought = await mockPurchase(db, "alice", "small", now);
  assert.equal(bought.free, 15);
  assert.equal(bought.balance, 8);
  assert.equal((await walletSummary(exhausted(2), "alice", now)).free, 0);
});

test("로그인하지 않은 기기는 브리핑을 무료 쿠키와 다른 이름으로 센다", async () => {
  const previous = process.env.AI_LIMIT_SECRET;
  process.env.AI_LIMIT_SECRET = "test-only-secret";
  try {
    const { getAiUsageToday, recordAiUse } = load("lib/ai-limit.ts");
    const response = NextResponse.json({});
    recordAiUse(response, 0, "briefing");
    const set = response.cookies.getAll();
    assert.deepEqual(set.map((c) => c.name), ["unis_ai_briefing"]);
    const request = new NextRequest("https://unis.test/api/briefing", { headers: { cookie: `unis_ai_briefing=${set[0].value}` } });
    assert.equal(getAiUsageToday(request, "briefing"), 1);
    assert.equal(getAiUsageToday(request), 0);
  } finally {
    if (previous === undefined) delete process.env.AI_LIMIT_SECRET; else process.env.AI_LIMIT_SECRET = previous;
  }
});

test("모의 충전은 상품만큼 넣고, 다른 계정과 섞이지 않는다", async () => {
  const db = database();
  const small = COOKIE_PACKS.find((p) => p.id === "small");
  const result = await mockPurchase(db, "alice", "small", now);
  assert.equal(result.balance, small.cookies);
  assert.equal(result.purchasedToday, small.cookies);
  assert.equal((await walletSummary(db, "bob", now)).balance, 0);
});

test("없는 상품은 거절하고, 값은 서버 표에서만 정한다", async () => {
  const db = database();
  for (const bad of ["free", "", null, undefined, 999, { cookies: 1000 }]) {
    await assert.rejects(() => mockPurchase(db, "alice", bad, now), { status: 400 });
  }
  assert.equal(db.docs.has(WALLET), false);
});

test("모의 충전은 하루 30개까지이고 다음 날 다시 된다", async () => {
  const db = database();
  await mockPurchase(db, "alice", "large", now);
  await assert.rejects(() => mockPurchase(db, "alice", "small", now), { status: 429 });
  assert.equal(db.docs.get(WALLET).balance, 30);
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const next = await mockPurchase(db, "alice", "small", tomorrow);
  assert.equal(next.balance, 35);
  assert.equal(next.purchasedToday, 5);
  assert.equal((await walletSummary(db, "alice", tomorrow)).purchasedToday, 5);
});

test("저장된 값이 이상해도 잔액을 만들어 내지 않는다", () => {
  for (const bad of [null, "x", { balance: -3 }, { balance: 1.5 }, { balance: "99" }]) {
    assert.equal(readWallet(bad, 0).balance, 0);
  }
  assert.deepEqual(readWallet({ balance: 2, pending: { a: 5, b: "x", c: 500 } }, 100).pending, { c: 500 });
});

test("쿠키 API는 로그인 없이는 401이다", async () => {
  stubs.set("@/lib/cookie-store", load("lib/cookie-store.ts"));
  stubs.set("@/lib/firebase-admin", load("lib/firebase-admin.ts"));
  const { GET, POST } = load("app/api/cookies/route.ts");
  const get = await GET(new NextRequest("https://unis.test/api/cookies"));
  assert.equal(get.status, 401);
  const post = await POST(new NextRequest("https://unis.test/api/cookies", { method: "POST", body: JSON.stringify({ pack: "large" }) }));
  assert.equal(post.status, 401);
});
