import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { NextResponse } from "next/server.js";

const root = fileURLToPath(new URL("../src", import.meta.url));
function loader(stubs = new Map()) {
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = new Module(filename);
    mod.filename = filename;
    mod.paths = Module._nodeModulePaths(path.dirname(filename));
    const original = mod.require.bind(mod);
    mod.require = (name) => {
      if (name === "next/server") return { NextResponse };
      if (stubs.has(name)) return stubs.get(name);
      const local = name.startsWith("@/") ? path.join(root, name.slice(2)) : name.startsWith(".") ? path.resolve(path.dirname(filename), name) : null;
      return local ? load(`${local}.ts`) : original(name);
    };
    cache.set(filename, mod);
    mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, filename);
    return mod.exports;
  }
  return load;
}
const load = loader();
const { issueCalendarSubscription, readSubscriptionCalendar, hasCalendarSubscription, hashCalendarToken, calendarTokenFromPath } = load("lib/calendar-subscription.ts");
const { AccountApiError } = load("lib/firebase-admin.ts");
function database() {
  const docs = new Map();
  let queue = Promise.resolve();
  const snapshot = (key, source = docs) => ({ exists: source.has(key), data: () => structuredClone(source.get(key)) });
  return {
    docs,
    doc: (key) => ({ key, get: async () => snapshot(key) }),
    runTransaction(fn) {
      const run = queue.then(async () => {
        const draft = new Map(docs);
        const result = await fn({ get: async (ref) => snapshot(ref.key, draft), set: (ref, data) => draft.set(ref.key, structuredClone(data)), delete: (ref) => draft.delete(ref.key) });
        docs.clear(); for (const [key, value] of draft) docs.set(key, value);
        return result;
      });
      queue = run.catch(() => {});
      return run;
    },
  };
}
const tokenOf = (url) => calendarTokenFromPath(url.split("/").at(-1));
const deadline = (id = "sample-1", title = "가상 시험") => ({ id, title, course: "예시 과목", when: "11월 20일", date: "2026-11-20", kind: "기말" });
const backup = (db, uid, deadlines) => db.docs.set(`users/${uid}/backups/current`, { version: 1, data: { deadlines, receipts: [{ privateText: "노출하면 안 되는 가상 메모" }] } });

test("긴 주소를 발급하고 원문 없이 SHA-256 해시만 저장한다", async () => {
  const db = database();
  assert.equal(await hasCalendarSubscription(db, "alice"), false);
  const url = await issueCalendarSubscription(db, "alice", "create");
  const token = tokenOf(url);
  assert.match(url, /^\/api\/calendar\/[A-Za-z0-9_-]{43}\.ics$/);
  assert.equal(await hasCalendarSubscription(db, "alice"), true);
  assert.equal(db.docs.get("calendarSubscriptions/alice").tokenHash, hashCalendarToken(token));
  assert.equal([...db.docs.keys()].some((key) => key.includes(token)), false);
  assert.equal(JSON.stringify([...db.docs]).includes(token), false);
  await assert.rejects(() => issueCalendarSubscription(db, "alice", "create"), { status: 409 });
});
test("재발급은 옛 주소를 즉시 무효화하고 새 주소만 살린다", async () => {
  const db = database();
  backup(db, "alice", [deadline()]);
  const old = tokenOf(await issueCalendarSubscription(db, "alice", "create"));
  const next = tokenOf(await issueCalendarSubscription(db, "alice", "rotate"));
  assert.notEqual(old, next);
  assert.equal(await readSubscriptionCalendar(db, old), null);
  assert.equal(db.docs.has(`calendarSubscriptionTokens/${hashCalendarToken(old)}`), false);
  assert.match(await readSubscriptionCalendar(db, next), /BEGIN:VEVENT/);
});
test("동시 재발급 뒤에도 계정당 유효 주소는 하나다", async () => {
  const db = database();
  await issueCalendarSubscription(db, "alice", "create");
  const urls = await Promise.all([issueCalendarSubscription(db, "alice", "rotate"), issueCalendarSubscription(db, "alice", "rotate")]);
  const calendars = await Promise.all(urls.map((url) => readSubscriptionCalendar(db, tokenOf(url))));
  assert.equal(calendars.filter((value) => value !== null).length, 1);
});
test("구독은 연결된 본인의 백업 일정만 읽고 다음 요청에 갱신을 반영한다", async () => {
  const db = database();
  backup(db, "alice", [deadline("alice-id", "가상 A 시험")]);
  backup(db, "bob", [deadline("bob-id", "가상 B 시험")]);
  const a = tokenOf(await issueCalendarSubscription(db, "alice", "create"));
  const b = tokenOf(await issueCalendarSubscription(db, "bob", "create"));
  const calendar = await readSubscriptionCalendar(db, a);
  assert.match(calendar, /가상 A 시험/);
  assert.doesNotMatch(calendar, /가상 B 시험|가상 메모/);
  await issueCalendarSubscription(db, "bob", "rotate");
  assert.equal(await readSubscriptionCalendar(db, b), null);
  assert.notEqual(await readSubscriptionCalendar(db, a), null);
  backup(db, "alice", [deadline("alice-id", "수정한 가상 시험")]);
  assert.match(await readSubscriptionCalendar(db, a), /수정한 가상 시험/);
  db.docs.delete("users/alice/backups/current");
  assert.doesNotMatch(await readSubscriptionCalendar(db, a), /BEGIN:VEVENT/);
});
test("잘못된·없는 토큰과 소유자 매핑이 다른 토큰은 거절한다", async () => {
  const db = database();
  assert.equal(await readSubscriptionCalendar(db, "x".repeat(43)), null);
  assert.equal(await readSubscriptionCalendar(db, "../bad"), null);
  const token = tokenOf(await issueCalendarSubscription(db, "alice", "create"));
  db.docs.set(`calendarSubscriptionTokens/${hashCalendarToken(token)}`, { uid: "bob" });
  assert.equal(await readSubscriptionCalendar(db, token), null);
  for (const value of ["bad.ics", "../bad.ics", "x".repeat(43), "x".repeat(44) + ".ics"]) assert.equal(calendarTokenFromPath(value), null);
});
test("일정·빈 일정 모두 유효한 ICS이며 UID·종일 날짜·알림을 유지한다", async () => {
  const db = database();
  const token = tokenOf(await issueCalendarSubscription(db, "alice", "create"));
  const empty = await readSubscriptionCalendar(db, token);
  assert.match(empty, /^BEGIN:VCALENDAR\r\n/);
  assert.match(empty, /VERSION:2.0/);
  assert.match(empty, /END:VCALENDAR\r\n$/);
  assert.doesNotMatch(empty, /BEGIN:VEVENT/);
  backup(db, "alice", [deadline()]);
  const ics = (await readSubscriptionCalendar(db, token)).replace(/\r\n[ \t]/g, "");
  assert.match(ics, /UID:sample-1@unis/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261120/);
  assert.match(ics, /DTEND;VALUE=DATE:20261121/);
  assert.match(ics, /BEGIN:VALARM/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 1);
});
test("손상된 백업·실제 없는 날짜는 빈 캘린더로 숨기지 않고 오류 처리", async () => {
  const db = database();
  const token = tokenOf(await issueCalendarSubscription(db, "alice", "create"));
  backup(db, "alice", [{ ...deadline(), date: "2026-02-30" }]);
  await assert.rejects(() => readSubscriptionCalendar(db, token), { status: 503 });
  db.docs.set("users/alice/backups/current", { data: { deadlines: [] } });
  await assert.rejects(() => readSubscriptionCalendar(db, token), { status: 503 });
});

test("API: 로그인 필요·남의 uid/토큰 지정 거절·없는 주소 404·ICS 응답 헤더", async () => {
  const db = database();
  const stubs = new Map([["@/lib/firebase-admin", {
    AccountApiError,
    getAdminDb: async () => db,
    verifiedUid: async (req) => {
      const auth = req.headers.get("Authorization");
      if (!auth) return null;
      if (auth === "Bearer alice") return "alice";
      if (auth === "Bearer bob") return "bob";
      throw new AccountApiError(401, "로그인을 확인해 주세요.");
    },
  }]]);
  stubs.set("./firebase-admin", stubs.get("@/lib/firebase-admin"));
  const apiLoad = loader(stubs);
  const management = apiLoad("app/api/calendar/subscription/route.ts");
  const feed = apiLoad("app/api/calendar/[token]/route.ts");
  const req = (uid, body) => new Request("https://unis.test/api/calendar/subscription", {
    method: body ? "POST" : "GET", headers: uid ? { Authorization: `Bearer ${uid}` } : {}, body: body ? JSON.stringify(body) : undefined,
  });
  assert.equal((await management.GET(req(null))).status, 401);
  assert.equal((await management.POST(req(null, { action: "create" }))).status, 401);
  assert.equal((await management.POST(req("invalid", { action: "create" }))).status, 401);
  const issued = await management.POST(req("alice", { action: "create" }));
  assert.equal(issued.status, 200);
  assert.match(issued.headers.get("Cache-Control"), /no-store/);
  const { path: url } = await issued.json();
  assert.deepEqual(await (await management.GET(req("alice"))).json(), { active: true });
  assert.deepEqual(await (await management.GET(req("bob"))).json(), { active: false });
  assert.equal((await management.POST(req("bob", { action: "rotate", uid: "alice", token: tokenOf(url) }))).status, 400);
  assert.equal((await management.POST(req("bob", { action: "rotate" }))).status, 409);
  assert.equal((await management.POST(req("alice", { action: "create", extra: "x".repeat(1024) }))).status, 413);
  const getFeed = (value) => feed.GET(new Request(`https://unis.test/api/calendar/${value}`), { params: Promise.resolve({ token: value }) });
  assert.equal((await getFeed("x".repeat(43) + ".ics")).status, 404);
  assert.equal((await getFeed("bad.ics")).status, 404);
  const response = await getFeed(url.split("/").at(-1));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type"), /text\/calendar/);
  assert.match(response.headers.get("Cache-Control"), /no-store/);
  assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
  assert.match(await response.text(), /BEGIN:VCALENDAR/);
  assert.equal((await management.POST(req("alice", { action: "rotate" }))).status, 200);
  assert.equal((await getFeed(url.split("/").at(-1))).status, 404);
});

test("로컬 Firestore: 실제 재발급 트랜잭션과 화면의 토큰 문서 접근 차단", { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
  const { initializeApp, deleteApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const { initializeTestEnvironment, assertFails } = await import("@firebase/rules-unit-testing");
  const { doc, getDoc, setDoc } = await import("firebase/firestore");
  const app = initializeApp({ projectId: "demo-unis-login" }, "ics-subscription-test");
  const db = getFirestore(app);
  const uid = `ics-test-${Date.now()}`;
  const owner = `calendarSubscriptions/${uid}`;
  const backupPath = `users/${uid}/backups/current`;
  const tokenPaths = [];
  let environment;
  try {
    await db.doc(backupPath).set({ version: 1, data: { deadlines: [deadline()] } });
    const old = tokenOf(await issueCalendarSubscription(db, uid, "create"));
    tokenPaths.push(`calendarSubscriptionTokens/${hashCalendarToken(old)}`);
    const next = tokenOf(await issueCalendarSubscription(db, uid, "rotate"));
    tokenPaths.push(`calendarSubscriptionTokens/${hashCalendarToken(next)}`);
    assert.equal(await readSubscriptionCalendar(db, old), null);
    assert.match(await readSubscriptionCalendar(db, next), /BEGIN:VEVENT/);
    const saved = await db.doc(owner).get();
    assert.equal(saved.data().tokenHash, hashCalendarToken(next));
    assert.equal(JSON.stringify(saved.data()).includes(next), false);
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
    environment = await initializeTestEnvironment({ projectId: "demo-unis-login", firestore: {
      host, port: Number(port), rules: fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"),
    } });
    for (const context of [environment.unauthenticatedContext(), environment.authenticatedContext(uid), environment.authenticatedContext(`${uid}-other`)]) {
      const client = context.firestore();
      for (const documentPath of [owner, tokenPaths.at(-1)]) {
        await assertFails(getDoc(doc(client, documentPath)));
        await assertFails(setDoc(doc(client, documentPath), { uid: "other" }));
      }
    }
  } finally {
    await environment?.cleanup();
    await Promise.all([owner, backupPath, ...tokenPaths].map((key) => db.doc(key).delete()));
    await db.terminate();
    await deleteApp(app);
  }
});
