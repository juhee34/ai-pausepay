// 실행: node --test tests/risk.test.mjs
// 학기 리스크 지도 계산을 손 계산과 비교한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../src/lib/", import.meta.url));
function load(name) {
  const filename = path.join(root, `${name}.ts`);
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(root);
  const original = mod.require.bind(mod);
  mod.require = (id) => (id === "./briefing" ? load("briefing") : original(id));
  mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return mod.exports;
}
const { buildRiskMap, hoursOf, spreadHours, topCrowdedWeek, topWeeks, weekNumberOf } = load("risk");

const TODAY = "2026-11-03"; // 10주차
const exam = (course, date) => ({ title: "기말고사", course, date, kind: "기말" });

test("예상 시간은 종류별 기본값이고, 직접 넣은 시간이 있으면 그 값이다", () => {
  assert.equal(hoursOf({ kind: "기말" }), 8);
  assert.equal(hoursOf({ kind: "중간" }), 8);
  assert.equal(hoursOf({ kind: "과제" }), 3);
  assert.equal(hoursOf({ kind: "퀴즈" }), 1);
  assert.equal(hoursOf({ kind: "기타" }), 1);
  assert.equal(hoursOf({ kind: "과제", hours: 5 }), 5);
});

test("칸의 숫자는 그 주의 예상 공부 시간이고 합계와 평균이 손 계산과 같다", () => {
  const map = buildRiskMap(
    [
      exam("경영통계", "2026-12-08"), // 15주차
      exam("회계원리", "2026-12-09"),
      { title: "과제 1", course: "경영통계", date: "2026-11-05", kind: "과제" }, // 10주차
      { title: "퀴즈", course: "회계원리", date: "2026-11-06", kind: "퀴즈" },
    ],
    TODAY,
    "now",
  );
  assert.equal(map.weeks.length, 7); // 10~16주차
  assert.equal(weekNumberOf("2026-12-08"), 15);
  const week = (n) => map.weeks.find((w) => w.week === n);
  assert.equal(week(15).total, 16);
  assert.equal(week(10).total, 4);
  assert.equal(map.average, 20 / 7);
  assert.equal(week(15).crowded, true); // 16 ≥ 평균 2.86 × 1.5
  assert.equal(week(15).count, 2);
  assert.deepEqual(map.rows.find((r) => r.course === "경영통계").cells, [3, 0, 0, 0, 0, 8, 0]);
});

test("미리 나누면 시험 시간의 70%를 앞 4주에 나누고 합은 그대로다", () => {
  assert.deepEqual(spreadHours(8, 15, 10), [
    { week: 11, value: 1 },
    { week: 12, value: 1 },
    { week: 13, value: 2 },
    { week: 14, value: 2 },
    { week: 15, value: 2 },
  ]);
  assert.deepEqual(spreadHours(8, 10, 10), [{ week: 10, value: 8 }]); // 이번 주 시험은 나눌 앞 주가 없다
  const parts = spreadHours(1, 15, 10);
  assert.equal(parts.reduce((sum, p) => sum + p.value, 0), 1);
  assert.ok(parts.every((p) => p.value > 0));
});

test("미리 나누면 몰린 주의 합계가 줄어든다", () => {
  const items = [exam("a", "2026-12-08"), exam("b", "2026-12-09"), exam("c", "2026-12-10")];
  const now = buildRiskMap(items, TODAY, "now");
  const spread = buildRiskMap(items, TODAY, "spread");
  assert.equal(now.weeks.find((w) => w.week === 15).total, 24);
  assert.equal(spread.weeks.find((w) => w.week === 15).total, 6);
  assert.equal(topCrowdedWeek(now).week, 15);
  assert.equal(now.weeks.reduce((s, w) => s + w.total, 0), spread.weeks.reduce((s, w) => s + w.total, 0));
});

test("주마다 할 일 목록이 있고, 나눈 시간은 준비로 표시한다", () => {
  const items = [exam("경영통계", "2026-12-08"), { title: "과제 1", course: "회계", date: "2026-11-25", kind: "과제" }];
  const now = buildRiskMap(items, TODAY, "now");
  assert.deepEqual(now.weeks.find((w) => w.week === 15).items, [
    { course: "경영통계", title: "기말고사", hours: 8, prep: false },
  ]);
  const spread = buildRiskMap(items, TODAY, "spread");
  const w13 = spread.weeks.find((w) => w.week === 13).items;
  assert.deepEqual(w13[0], { course: "회계", title: "과제 1", hours: 3, prep: false }); // 시간 많은 순
  assert.deepEqual(w13[1], { course: "경영통계", title: "기말고사", hours: 2, prep: true });
});

test("직접 넣은 예상 시간을 쓰고, 지난 일과 끝낸 일과 16주차 뒤는 뺀다", () => {
  const map = buildRiskMap(
    [
      { title: "큰 과제", course: "a", date: "2026-11-05", kind: "과제", hours: 10 },
      { title: "지난 일", course: "a", date: "2026-11-01", kind: "과제" },
      { title: "끝낸 일", course: "a", date: "2026-11-05", kind: "과제", done: true },
      { title: "먼 일", course: "a", date: "2027-02-01", kind: "과제" },
    ],
    TODAY,
    "now",
  );
  assert.equal(map.weeks[0].total, 10);
  assert.equal(map.weeks.reduce((s, w) => s + w.total, 0), 10);
});

test("바쁜 주는 시간이 많은 순서로 3개까지, 빈 주는 빼고 보여 준다", () => {
  const items = [
    { title: "a", course: "x", date: "2026-11-05", kind: "퀴즈" }, // 10주차 1
    { title: "b", course: "x", date: "2026-11-12", kind: "과제" }, // 11주차 3
    exam("x", "2026-11-19"), // 12주차 8
    { title: "c", course: "x", date: "2026-11-26", kind: "기타" }, // 13주차 1
  ];
  const map = buildRiskMap(items, TODAY, "now");
  assert.deepEqual(topWeeks(map).map((w) => w.week), [12, 11, 10]);
  assert.deepEqual(topWeeks(buildRiskMap([], TODAY, "now")), []);
});
