import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// today-plan.ts는 다른 모듈에 기대지 않는 순수 함수라 TypeScript만 바꿔서 불러온다.
const filename = fileURLToPath(new URL("../src/lib/today-plan.ts", import.meta.url));
const loaded = new Module(filename);
loaded._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  filename,
);
const { scoreTasks, planToday, exampleTasks, parseAvailableHours, DEFAULT_WEIGHT } = loaded.exports;

const TODAY = "2026-11-03";
const NO_SOURCES = { grading: {}, targets: {}, accuracy: {}, allTasks: [] };

test("예시 일정 5개: 손으로 계산한 효율과 순서가 같다 (PRD 2-1 끝났다는 기준)", () => {
  const scored = scoreTasks(TODAY, exampleTasks(TODAY), NO_SOURCES);
  assert.deepEqual(
    scored.map((t) => t.title),
    ["팀 과제 발표자료", "퀴즈 3", "기말 대비 · 퀴즈 복습", "과제 3", "실습 보고서"],
  );
  const expected = [2.925, 1.725, 1.125, 1.0, 0.9];
  scored.forEach((t, i) => assert.ok(Math.abs(t.efficiency - expected[i]) < 1e-9, `${t.title} ${t.efficiency}`));
  assert.deepEqual(scored.map((t) => t.level), ["높음", "보통", "보통", "보통", "낮음"]);
  assert.deepEqual(scored.map((t) => t.days), [3, 5, 35, 9, 12]);
});

test("직접 넣은 시간은 0.5~24시간만 받고 소수 한 자리로 맞춘다", () => {
  assert.equal(parseAvailableHours("2"), 2);
  assert.equal(parseAvailableHours(" 1.5 "), 1.5);
  assert.equal(parseAvailableHours("0.5"), 0.5);
  assert.equal(parseAvailableHours("24"), 24);
  assert.equal(parseAvailableHours("2.34"), 2.3);
  for (const bad of ["", " ", "0", "0.4", "-1", "25", "abc", "1시간", "Infinity"]) {
    assert.equal(parseAvailableHours(bad), null, bad);
  }
});

test("4시간이 넘는 시간과 소수 시간도 끝까지 나눈다", () => {
  const scored = scoreTasks(TODAY, exampleTasks(TODAY), NO_SOURCES);
  const six = planToday(scored, 6);
  assert.deepEqual(six.picks.map((p) => p.hours), [2, 1, 3]);
  assert.equal(six.used, 6);
  const half = planToday(scored, 2.5);
  assert.deepEqual(half.picks.map((p) => p.hours), [2, 0.5]);
  assert.equal(half.used, 2.5);
  const all = planToday(scored, 24);
  assert.equal(all.used, 17); // 할 일을 모두 해도 2 + 1 + 8 + 3 + 3시간
  assert.equal(all.deferred, null);
});

test("시간을 바꾸면 추천이 바뀐다 (PRD 2-1 끝났다는 기준)", () => {
  const scored = scoreTasks(TODAY, exampleTasks(TODAY), NO_SOURCES);

  const one = planToday(scored, 1);
  assert.deepEqual(one.picks.map((p) => [p.task.title, p.hours]), [["팀 과제 발표자료", 1]]);
  assert.equal(one.deferred.title, "퀴즈 3");

  const two = planToday(scored, 2);
  assert.deepEqual(two.picks.map((p) => [p.task.title, p.hours]), [["팀 과제 발표자료", 2]]);
  assert.equal(two.used, 2);
  assert.equal(two.deferred.title, "퀴즈 3");

  const three = planToday(scored, 3);
  assert.deepEqual(three.picks.map((p) => p.task.title), ["팀 과제 발표자료", "퀴즈 3"]);
  assert.equal(three.used, 3);
  assert.equal(three.deferred.title, "기말 대비 · 퀴즈 복습");

  // 4시간이면 8시간짜리 기말 복습에 남은 1시간을 나눠 준다. 시간이 남지 않는다.
  const four = planToday(scored, 4);
  assert.deepEqual(four.picks.map((p) => [p.task.title, p.hours]), [
    ["팀 과제 발표자료", 2],
    ["퀴즈 3", 1],
    ["기말 대비 · 퀴즈 복습", 1],
  ]);
  assert.equal(four.used, 4);
  assert.equal(four.deferred.title, "과제 3");
});

test("할 일을 다 해도 시간이 남으면 남은 시간을 그대로 둔다", () => {
  const scored = scoreTasks(TODAY, [{ id: "q", course: "x", title: "퀴즈", date: "2026-11-20", kind: "퀴즈" }], NO_SOURCES);
  const plan = planToday(scored, 4);
  assert.deepEqual(plan.picks.map((p) => p.hours), [1]);
  assert.equal(plan.used, 1);
  assert.equal(plan.deferred, null);
});

test("평가 비율이 있으면 같은 과목·같은 종류 일정 수로 나누고, 없으면 기본값", () => {
  const tasks = [
    { id: "a", course: "재무관리", title: "과제 1", date: "2026-11-20", kind: "과제" },
    { id: "b", course: "재무관리", title: "과제 2", date: "2026-11-27", kind: "과제" },
    { id: "c", course: "마케팅", title: "중간고사", date: "2026-11-30", kind: "중간" },
  ];
  const sources = {
    grading: { 재무관리: [{ name: "과제", weight: 30 }] },
    targets: {},
    accuracy: {},
    allTasks: [...tasks, { course: "재무관리", kind: "과제" }], // 끝낸 과제 1개 포함 → 3개로 나눔
  };
  const byId = Object.fromEntries(scoreTasks(TODAY, tasks, sources).map((t) => [t.id, t]));
  assert.equal(byId.a.weight, 10);
  assert.equal(byId.b.weight, 10);
  assert.equal(byId.c.weight, DEFAULT_WEIGHT.중간);
  assert.equal(byId.c.hours, 8);
});

test("목표 점수와 시험 대비 정답률을 쓰고, 이미 목표보다 높으면 효율 0", () => {
  const tasks = [
    { id: "a", course: "재무관리", title: "퀴즈", date: "2026-11-20", kind: "퀴즈", weight: 10, hours: 1 },
    { id: "b", course: "마케팅", title: "퀴즈", date: "2026-11-20", kind: "퀴즈", weight: 10, hours: 1 },
  ];
  const sources = { grading: {}, targets: { 재무관리: 80, 마케팅: 90 }, accuracy: { 재무관리: 0.5, 마케팅: 0.95 }, allTasks: [] };
  const byId = Object.fromEntries(scoreTasks(TODAY, tasks, sources).map((t) => [t.id, t]));
  assert.ok(Math.abs(byId.a.efficiency - 10 * 0.3) < 1e-9);
  assert.equal(byId.b.efficiency, 0);
});

test("시작일이 아직 안 된 일은 빼고, 오늘이 시작일이면 넣는다", () => {
  const tasks = [
    { id: "a", course: "x", title: "내일 시작", date: "2026-11-20", kind: "과제", startDate: "2026-11-04" },
    { id: "b", course: "x", title: "오늘 시작", date: "2026-11-20", kind: "과제", startDate: TODAY },
    { id: "c", course: "x", title: "어제 시작", date: "2026-11-20", kind: "과제", startDate: "2026-11-02" },
    { id: "d", course: "x", title: "시작일 없음", date: "2026-11-20", kind: "과제" },
  ];
  assert.deepEqual(scoreTasks(TODAY, tasks, NO_SOURCES).map((t) => t.id).sort(), ["b", "c", "d"]);
});

test("직접 넣은 예상 시간으로 효율과 시간을 계산한다", () => {
  const tasks = [
    { id: "a", course: "x", title: "기본", date: "2026-11-30", kind: "과제" }, // 3시간
    { id: "b", course: "y", title: "짧게", date: "2026-11-30", kind: "과제", hours: 1 },
  ];
  const scored = scoreTasks(TODAY, tasks, NO_SOURCES);
  assert.equal(scored[0].id, "b");
  assert.ok(Math.abs(scored[0].efficiency - 3 * scored[1].efficiency) < 1e-9);
  assert.deepEqual(planToday(scored, 2).picks.map((p) => [p.task.id, p.hours]), [["b", 1], ["a", 1]]);
});

test("지난 일정은 빼고, 일정이 없으면 추천도 없다", () => {
  const past = [{ id: "p", course: "x", title: "지난 과제", date: "2026-11-01", kind: "과제" }];
  assert.equal(scoreTasks(TODAY, past, NO_SOURCES).length, 0);
  const empty = planToday([], 2);
  assert.deepEqual(empty, { picks: [], used: 0, deferred: null });
});
