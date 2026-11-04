// 실행: node --test tests/focus.test.mjs
// 집중 모드의 일정 연결과 주차별 합계를 검사한다.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => void memory.set(key, String(value)),
  removeItem: (key) => void memory.delete(key),
};

function load(file) {
  const filename = fileURLToPath(new URL(`../src/app/focus/${file}`, import.meta.url));
  const loaded = new Module(filename);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(fileURLToPath(new URL("../src/app/focus/", import.meta.url)));
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
  return loaded.exports;
}
const store = load("store.ts");
const { weeklyMinutes } = load("weekly.ts");

const saved = () => JSON.parse(memory.get("unis-focus"));
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();

beforeEach(() => memory.clear());

test("일정에서 시작한 기록에 일정 정보가 남는다", () => {
  store.startFocus("재무관리", { deadlineId: "d1" });
  const { endsAt } = store.getData().session;
  store.settleSession(endsAt);
  const [record] = saved().records;
  assert.equal(record.subject, "재무관리");
  assert.equal(record.deadlineId, "d1");
  assert.equal(record.activityId, undefined);
});

test("대외활동 연결도 남고, 연결 없이 시작하면 칸이 생기지 않는다", () => {
  store.startFocus("서포터즈", { activityId: "a1" });
  store.settleSession(store.getData().session.endsAt);
  store.endSession();
  store.startFocus("재무관리");
  store.settleSession(store.getData().session.endsAt);
  const [first, second] = saved().records;
  assert.equal(first.activityId, "a1");
  assert.deepEqual(Object.keys(second).sort(), ["finishedAt", "minutes", "subject"]);
});

test("옛 기록과 진행 중인 옛 타이머가 그대로 읽힌다", () => {
  const old = {
    subjects: ["통계"],
    records: [{ subject: "통계", minutes: 25, finishedAt: 100 }],
    session: { subject: "통계", phase: "break", endsAt: 200 },
  };
  memory.set("unis-focus", JSON.stringify(old));
  assert.deepEqual(store.getData(), old);
});

test("고른 시간만큼 타이머가 돌고 그만큼 기록된다", () => {
  const before = Date.now();
  store.startFocus("재무관리", {}, 2);
  const { endsAt, minutes } = store.getData().session;
  assert.equal(minutes, 120);
  assert.ok(endsAt >= before + 2 * 60 * 60 * 1000);
  store.settleSession(endsAt);
  assert.equal(saved().records[0].minutes, 120);
});

test("시간을 고르지 않으면 1시간이고, 끝나기 전에 그만두면 기록하지 않는다", () => {
  store.startFocus("재무관리");
  assert.equal(store.getData().session.minutes, 60);
  store.endSession();
  assert.deepEqual(saved().records, []);
});

test("진행 중이던 옛 타이머는 25분으로 기록된다", () => {
  memory.set(
    "unis-focus",
    JSON.stringify({ subjects: [], records: [], session: { subject: "통계", phase: "focus", endsAt: 200 } }),
  );
  store.settleSession(200);
  assert.equal(saved().records[0].minutes, 25);
});

test("연결 정보는 저장소를 다시 읽어도 사라지지 않는다", () => {
  memory.set(
    "unis-focus",
    JSON.stringify({
      subjects: [],
      records: [{ subject: "통계", minutes: 25, finishedAt: 1, deadlineId: "d9" }],
      session: null,
    }),
  );
  assert.equal(store.getData().records[0].deadlineId, "d9");
});

test("주차별 막대 합계가 기록 합계와 같고 주 경계가 맞다", () => {
  const now = at(2026, 11, 4);
  const records = [
    { minutes: 25, finishedAt: at(2026, 11, 2, 0) }, // 월요일 0시 → 이번 주
    { minutes: 50, finishedAt: at(2026, 11, 4) },
    { minutes: 25, finishedAt: at(2026, 11, 1, 23) }, // 일요일 밤 → 지난주
    { minutes: 25, finishedAt: at(2026, 9, 28) }, // 6주 중 가장 오래된 주
  ];
  const bars = weeklyMinutes(records, now, []);
  assert.deepEqual(bars.map((b) => b.start), ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02"]);
  assert.deepEqual(bars.map((b) => b.minutes), [25, 0, 0, 0, 25, 75]);
  const sum = bars.reduce((total, b) => total + b.minutes, 0);
  assert.equal(sum, records.reduce((total, r) => total + r.minutes, 0));
  assert.deepEqual(bars.map((b) => b.isCurrent), [false, false, false, false, false, true]);
});

test("6주 밖 기록은 막대에서 빠지고, 시험이 든 주를 표시한다", () => {
  const now = at(2026, 11, 4);
  const bars = weeklyMinutes([{ minutes: 25, finishedAt: at(2026, 9, 27) }], now, ["2026-10-21", "2026-12-10"]);
  assert.equal(bars.reduce((total, b) => total + b.minutes, 0), 0);
  assert.deepEqual(bars.map((b) => b.isExam), [false, false, false, true, false, false]);
});
