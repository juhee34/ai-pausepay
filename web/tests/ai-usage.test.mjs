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
const { seoulDay, weekStart, emptyCounts } = load("lib/ai-usage.ts");
const { reserveUsage, settleUsage, usageSummary } = load("lib/ai-usage-store.ts");

// 실제 트랜잭션 콜백에 직렬화한 메모리 저장소를 주입한다. 실계정·키·AI 호출 없음.
function database() {
  const docs = new Map();
  let queue = Promise.resolve();
  return {
    docs,
    doc: (key) => key,
    runTransaction(fn) {
      const run = queue.then(() => fn({
        get: async (key) => ({ data: () => structuredClone(docs.get(key)) }),
        set: (key, value) => docs.set(key, structuredClone(value)),
      }));
      queue = run.catch(() => {});
      return run;
    },
    collection(prefix) {
      const conditions = [];
      const query = {
        where(field, op, value) { conditions.push([op, value]); return query; },
        async get() {
          return { docs: [...docs].filter(([key]) => key.startsWith(`${prefix}/`)).map(([key, value]) => ({ id: key.split("/").at(-1), data: () => structuredClone(value) }))
            .filter((doc) => conditions.every(([op, value]) => op === ">=" ? doc.id >= value : doc.id <= value)) };
        },
      };
      return query;
    },
  };
}
const now = new Date("2026-11-04T01:00:00Z");
test("한국 자정·연도 경계와 월요일 기준 주간", () => {
  assert.equal(seoulDay(new Date("2026-11-03T14:59:59Z")), "2026-11-03");
  assert.equal(seoulDay(new Date("2026-11-03T15:00:00Z")), "2026-11-04");
  assert.equal(weekStart("2026-11-08"), "2026-11-02");
  assert.equal(weekStart("2026-11-09"), "2026-11-09");
  assert.equal(weekStart("2027-01-01"), "2026-12-28");
});
test("동시에 21번 요청해도 20번만 예약하고 다른 계정은 독립적", async () => {
  const db = database();
  const results = await Promise.allSettled(Array.from({ length: 21 }, () => reserveUsage(db, "alice", "exam", now)));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 20);
  assert.equal(results.find((r) => r.status === "rejected").reason.status, 429);
  await reserveUsage(db, "bob", "mail", now);
  assert.equal((await usageSummary(db, "alice", now)).remaining, 0);
  assert.equal((await usageSummary(db, "bob", now)).remaining, 19);
});
test("실패 해제·성공 집계는 중복 실행에도 한 번만, 만료 예약은 회수", async () => {
  const db = database();
  const failed = await reserveUsage(db, "alice", "exam", now);
  await settleUsage(db, failed, false);
  const success = await reserveUsage(db, "alice", "posting", now);
  await settleUsage(db, success, true);
  await settleUsage(db, success, true);
  const summary = await usageSummary(db, "alice", now);
  assert.equal(summary.usedToday, 1);
  assert.equal(summary.todayCounts.exam, 0);
  assert.equal(summary.todayCounts.posting, 1);
  assert.equal(summary.remaining, 19);
  await reserveUsage(db, "alice", "mail", now);
  await reserveUsage(db, "alice", "exam", new Date(now.getTime() + 121000));
  assert.equal(Object.keys(db.docs.get("users/alice/usage/2026-11-04").pending).length, 1);
});
test("이번 주만 합산하고 지난 주·다른 계정·내일 데이터는 제외", async () => {
  const db = database();
  for (const [uid, day, feature] of [["alice","2026-11-01","exam"],["alice","2026-11-02","exam"],["alice","2026-11-04","mail"],["alice","2026-11-05","receipt"],["bob","2026-11-04","posting"]]) {
    const lease = await reserveUsage(db, uid, feature, new Date(`${day}T01:00:00Z`));
    await settleUsage(db, lease, true);
  }
  const result = await usageSummary(db, "alice", now);
  assert.equal(result.usedToday, 1);
  assert.equal(result.weekCounts.exam, 1);
  assert.equal(result.weekCounts.mail, 1);
  assert.equal(result.weekCounts.receipt, 0);
  assert.equal(result.weekCounts.posting, 0);
  assert.deepEqual((await usageSummary(db, "nobody", now)).todayCounts, emptyCounts());
});

test("인증 없는 조회는 401, 잘못된 토큰은 익명으로 우회하지 않는다", async () => {
  const { verifiedUid } = load("lib/firebase-admin.ts");
  assert.equal(await verifiedUid(new Request("https://unis.test")), null);
  await assert.rejects(() => verifiedUid(new Request("https://unis.test", { headers: { Authorization: "wrong" } })), { status: 401 });
});

test("공통 도우미는 성공·실패·예외에 맞게 예약 처리, 인증 실패 시 AI 호출 차단", async () => {
  const db = database();
  let user = "alice";
  stubs.set("./firebase-admin", { ...load("lib/firebase-admin.ts"), getAdminDb: () => db, verifiedUid: async () => { if (user === "invalid") throw new (load("lib/firebase-admin.ts").AccountApiError)(401, "invalid"); return user; } });
  const { withAiUsage, checkAiLimit, completeAiUse } = load("lib/ai-route.ts");
  const request = () => new NextRequest("https://unis.test/api/exam");
  let calls = 0;
  const handler = (mode) => withAiUsage("exam", async (req) => {
    const limit = await checkAiLimit(req);
    if (limit instanceof NextResponse) return limit;
    calls++;
    if (mode === "throw") throw new Error("AI failed");
    if (mode === "fail") return NextResponse.json({}, { status: 502 });
    return completeAiUse(NextResponse.json({ ok: true }), req);
  });
  assert.equal((await handler("ok")(request())).headers.get("set-cookie"), null);
  await handler("fail")(request());
  await assert.rejects(() => handler("throw")(request()));
  const summary = await usageSummary(db, "alice");
  assert.equal(summary.usedToday, 1);
  assert.equal(summary.remaining, 19);
  user = "invalid";
  const before = calls;
  assert.equal((await handler("ok")(request())).status, 401);
  assert.equal(calls, before);
  user = null;
  process.env.AI_LIMIT_SECRET = "test-only-not-a-real-key";
  assert.match((await handler("ok")(request())).headers.get("set-cookie"), /unis_ai_usage=/);
  delete process.env.AI_LIMIT_SECRET;
});

test("실제 Firestore 에뮬레이터: 한 자리 남은 한도에서 동시 요청·집계·실패 해제", { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
  // 실계정 대신 demo 프로젝트에만 연결한다. .env.local은 로드하지 않는다.
  const { initializeApp, deleteApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const app = initializeApp({ projectId: "demo-unis-login" }, "usage-test");
  const db = getFirestore(app);
  const uid = `usage-test-${Date.now()}`;
  const ref = db.doc(`users/${uid}/usage/${seoulDay(now)}`);
  try {
    await ref.set({ counts: { ...emptyCounts(), exam: 19 }, pending: {} });
    const results = await Promise.allSettled([reserveUsage(db, uid, "mail", now), reserveUsage(db, uid, "posting", now)]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(results.find((r) => r.status === "rejected").reason.status, 429);
    const lease = results.find((r) => r.status === "fulfilled").value;
    assert.equal((await usageSummary(db, uid, now)).remaining, 0);
    await settleUsage(db, lease, false);
    assert.equal((await usageSummary(db, uid, now)).remaining, 1);
    const success = await reserveUsage(db, uid, "posting", now);
    await settleUsage(db, success, true);
    await settleUsage(db, success, true);
    const summary = await usageSummary(db, uid, now);
    assert.equal(summary.usedToday, 20);
    assert.equal(summary.todayCounts.posting, 1);
    assert.equal(summary.remaining, 0);
    assert.equal((await usageSummary(db, `${uid}-other`, now)).usedToday, 0);
  } finally {
    await ref.delete();
    await db.terminate();
    await deleteApp(app);
  }
});

test("화면 요청은 로그인 복원을 기다려 토큰 전달, 토큰 실패는 익명으로 보내지 않음", async () => {
  let ready = false;
  let fail = false;
  let signedIn = true;
  const auth = {
    async authStateReady() { ready = true; },
    get currentUser() {
      assert.equal(ready, true);
      return signedIn ? { async getIdToken() { if (fail) throw new Error("token failed"); return "test-token"; } } : null;
    },
  };
  stubs.set("./firebase", { getFirebaseAuth: () => auth });
  const { aiFetch } = load("lib/ai-fetch.ts");
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (url, init) => { requests.push({ url, init }); return new Response("{}"); };
  try {
    await aiFetch("/api/exam", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    assert.equal(requests[0].init.headers.get("Authorization"), "Bearer test-token");
    assert.equal(requests[0].init.headers.get("Content-Type"), "application/json");
    assert.equal(requests[0].init.cache, "no-store");
    fail = true;
    await assert.rejects(() => aiFetch("/api/mail"), /token failed/);
    assert.equal(requests.length, 1);
    signedIn = false;
    await aiFetch("/api/posting", { method: "POST", body: new FormData() });
    assert.equal(requests[1].init.headers.has("Authorization"), false);
    assert.equal(requests[1].init.headers.has("Content-Type"), false);
    await assert.rejects(() => aiFetch("https://other.test/api/exam"));
    assert.equal(requests.length, 2);
  } finally {
    global.fetch = originalFetch;
    stubs.delete("./firebase");
  }
});
