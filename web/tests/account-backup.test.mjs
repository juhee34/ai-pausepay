// 실행: node --test tests/account-backup.test.mjs
// 실제 Firebase 없이 Firestore 부분만 가짜로 바꿔 계정 백업 코드를 검사한다.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const sourceRoot = fileURLToPath(new URL("../src", import.meta.url));

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => void store.set(key, String(value)),
  removeItem: (key) => void store.delete(key),
};

let remote = null;
let lastPath = null;
let hang = false;
const stamp = { toDate: () => new Date("2026-11-04T01:00:00Z") };
const firestore = {
  doc: (_db, ...parts) => (lastPath = parts.join("/")),
  serverTimestamp: () => "SERVER_TIME",
  setDoc: (_ref, value) => (hang ? new Promise(() => {}) : Promise.resolve(void (remote = value))),
  deleteDoc: () => Promise.resolve(void (remote = null)),
  getDocFromServer: () =>
    hang
      ? new Promise(() => {})
      : Promise.resolve({ exists: () => remote !== null, data: () => ({ ...remote, updatedAt: stamp }) }),
};
let dbReady = true;
const stubs = new Map([
  ["firebase/firestore", firestore],
  ["./firebase", { getFirebaseDb: () => (dbReady ? {} : null) }],
]);

const cache = new Map();
function load(file) {
  const filename = path.resolve(sourceRoot, file);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = (name) => {
    if (stubs.has(name)) return stubs.get(name);
    if (name.startsWith("@/")) return load(`${name.slice(2)}.ts`);
    if (name.startsWith(".")) return load(path.relative(sourceRoot, path.resolve(path.dirname(filename), `${name}.ts`)));
    return originalRequire(name);
  };
  cache.set(filename, loaded);
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
  return loaded.exports;
}
const account = load("lib/account-backup.ts");
const backup = load("lib/backup.ts");

test("목표 직무는 파일·계정 백업으로 복원하고 기존 선택과 옛 백업은 유지한다", async () => {
  store.set("unis.targetJob.v1", "데이터 분석");
  assert.equal(backup.hasBackupData(), true);
  const data = backup.readBackupData();
  assert.equal(data.targetJob, "데이터 분석");
  assert.equal(backup.parseBackup(JSON.stringify({ app: "unis", version: 1, ...data })).targetJob, "데이터 분석");
  assert.equal(backup.parseBackupData({ ...data, targetJob: "없는 직무" }), null);
  await account.uploadAccountBackup("test-user");
  assert.equal(remote.data.targetJob, "데이터 분석");
  const restored = await account.readAccountBackup("test-user");
  store.clear();
  assert.equal(backup.importBackup(restored.data).targetJobAdded, true);
  assert.equal(store.get("unis.targetJob.v1"), "데이터 분석");
  store.set("unis.targetJob.v1", "서비스 기획");
  assert.equal(backup.importBackup(restored.data).targetJobAdded, false);
  assert.equal(store.get("unis.targetJob.v1"), "서비스 기획");
  const old = { ...data };
  delete old.targetJob;
  assert.deepEqual(backup.parseBackupData(old), old);
});

test("복원 도중 저장이 실패하면 목표 직무도 되돌린다", () => {
  const data = { ...backup.readBackupData(), targetJob: "데이터 분석" };
  const original = localStorage.setItem;
  let fail = true;
  localStorage.setItem = (key, value) => {
    if (key === "unis.deadlines.v1" && fail) { fail = false; throw new Error("storage full"); }
    original(key, value);
  };
  try { assert.throws(() => backup.importBackup(data)); }
  finally { localStorage.setItem = original; }
  assert.equal(store.has("unis.targetJob.v1"), false);
});

const DEADLINE = { id: "d1", title: "가상 과제", course: "가상 과목", when: "", date: "2026-11-20", kind: "과제" };
const RECEIPT = {
  id: "r1",
  title: "가상 활동",
  answers: { what: "a", role: "b", result: "c", learned: "d" },
  situation: "s",
  task: "t",
  action: "a",
  result: "r",
  oneLiner: "한 줄",
  competencies: ["협업·리더십"],
  createdAt: 1,
};

beforeEach(() => {
  store.clear();
  remote = null;
  lastPath = null;
  hang = false;
  dbReady = true;
});

test("올리는 문서는 firestore.rules의 형식과 같고 진행 중인 타이머는 빠진다", async () => {
  store.set("unis.deadlines.v1", JSON.stringify([DEADLINE, { id: "broken" }]));
  store.set("unis-focus", JSON.stringify({ subjects: ["과목"], records: [], session: { subject: "과목", phase: "focus", endsAt: 9 } }));
  await account.uploadAccountBackup("alice");

  assert.equal(lastPath, "users/alice/backups/current");
  assert.deepEqual(Object.keys(remote).sort(), ["data", "updatedAt", "version"]);
  assert.equal(remote.version, 1);
  assert.equal(remote.updatedAt, "SERVER_TIME");
  assert.deepEqual(
    Object.keys(remote.data).sort(),
    ["activities", "deadlines", "examResults", "focus", "grades", "grading", "receipts", "timetable"],
  );
  assert.deepEqual(Object.keys(remote.data.focus).sort(), ["records", "subjects"]);
  assert.equal(remote.data.deadlines.length, 1, "형식이 틀린 일정은 올리지 않는다");
});

test("Firestore가 받지 못하는 undefined를 올리지 않는다", async () => {
  store.set("unis.deadlines.v1", JSON.stringify([DEADLINE]));
  await account.uploadAccountBackup("alice");
  assert.equal(JSON.stringify(remote.data), JSON.stringify(JSON.parse(JSON.stringify(remote.data))));
  const hasUndefined = (value) =>
    value === undefined ||
    (value && typeof value === "object" && Object.values(value).some(hasUndefined));
  assert.equal(hasUndefined(remote.data), false);
});

test("기록이 없으면 계정 백업을 덮어쓰지 않는다", async () => {
  remote = { version: 1, data: "그대로" };
  await assert.rejects(() => account.uploadAccountBackup("alice"), /백업할 기록이 없어요/);
  assert.equal(remote.data, "그대로");
});

test("너무 크면 올리지 않고 안내한다", async () => {
  store.set("unis.deadlines.v1", JSON.stringify([{ ...DEADLINE, title: "가".repeat(400_000) }]));
  await assert.rejects(() => account.uploadAccountBackup("alice"), /너무 많아/);
  assert.equal(remote, null);
});

test("다른 폰에서 받으면 합쳐지고, 있던 기록은 지워지지 않는다", async () => {
  store.set("unis.deadlines.v1", JSON.stringify([DEADLINE]));
  store.set("unis.receipts.v1", JSON.stringify([RECEIPT]));
  await account.uploadAccountBackup("alice");

  store.clear();
  const mine = { ...DEADLINE, id: "d2", title: "이 폰의 일정" };
  store.set("unis.deadlines.v1", JSON.stringify([mine]));
  const saved = await account.readAccountBackup("alice");
  assert.equal(saved.updatedAt.toISOString(), "2026-11-04T01:00:00.000Z");
  const result = backup.importBackup(saved.data);

  assert.equal(result.addedDeadlines, 1);
  assert.equal(result.addedReceipts, 1);
  const titles = JSON.parse(store.get("unis.deadlines.v1")).map((d) => d.title).sort();
  assert.deepEqual(titles, ["가상 과제", "이 폰의 일정"]);
  assert.equal(backup.importBackup(saved.data).changed, false, "다시 받아도 늘어나지 않는다");
});

test("백업이 없으면 null, 형식이 틀리면 이 기기에 넣지 않고 오류", async () => {
  assert.equal(await account.readAccountBackup("alice"), null);
  remote = { version: 1, data: { deadlines: [{ id: "broken" }], activities: [] } };
  await assert.rejects(() => account.readAccountBackup("alice"), /읽지 못했어요/);
  remote = { version: 1 };
  await assert.rejects(() => account.readAccountBackup("alice"), /읽지 못했어요/);
});

test("응답이 없으면 끝없이 기다리지 않고 안내한다", async () => {
  store.set("unis.deadlines.v1", JSON.stringify([DEADLINE]));
  hang = true;
  await assert.rejects(() => account.uploadAccountBackup("alice", 20), /응답이 없어요/);
  await assert.rejects(() => account.readAccountBackup("alice", 20), /응답이 없어요/);
});

test("Firebase 설정이 없거나 잘못된 사용자면 올리지 않는다", async () => {
  store.set("unis.deadlines.v1", JSON.stringify([DEADLINE]));
  dbReady = false;
  await assert.rejects(() => account.uploadAccountBackup("alice"), /준비 중/);
  dbReady = true;
  await assert.rejects(() => account.uploadAccountBackup("a/b"));
  assert.equal(remote, null);
});

test("지우기는 계정 백업만 지우고 이 기기 기록은 그대로", async () => {
  store.set("unis.deadlines.v1", JSON.stringify([DEADLINE]));
  await account.uploadAccountBackup("alice");
  await account.removeAccountBackup("alice");
  assert.equal(remote, null);
  assert.equal(JSON.parse(store.get("unis.deadlines.v1")).length, 1);
});

test("오류 코드를 쉬운 안내로 바꾼다", () => {
  assert.match(account.accountBackupErrorMessage({ code: "permission-denied" }), /다시 로그인/);
  assert.match(account.accountBackupErrorMessage({ code: "unavailable" }), /인터넷/);
  assert.match(account.accountBackupErrorMessage(new Error("x")), /처리하지 못했어요/);
});
