// 실행: node --test tests/focus-goal.test.mjs
// 오늘의 한 가지 목표 시간을 25분 집중 횟수로 바꾸는 계산을 검사한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const filename = fileURLToPath(new URL("../src/app/focus/goal.ts", import.meta.url));
const loaded = new Module(filename);
loaded._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  filename,
);
const { focusGoal, hoursLabel, parseGoalHours, roundsFor } = loaded.exports;

const NOW = new Date(2026, 10, 4, 15).getTime();
const YESTERDAY = new Date(2026, 10, 3, 15).getTime();

test("목표 시간을 한 번 30분으로 나누고 올림한다", () => {
  assert.equal(roundsFor(2, 30), 4);
  assert.equal(roundsFor(1, 30), 2);
  assert.equal(roundsFor(0.5, 30), 1);
  assert.equal(roundsFor(1.2, 30), 3);
  assert.equal(roundsFor(0.1, 30), 1);
});

test("주소 값은 쓸 수 있는 시간만 받는다", () => {
  assert.equal(parseGoalHours("2"), 2);
  assert.equal(parseGoalHours("0.5"), 0.5);
  for (const bad of [null, "", "0", "-1", "abc", "13", "Infinity"]) assert.equal(parseGoalHours(bad), null);
});

test("오늘 끝낸 그 일정의 기록만 센다", () => {
  const records = [
    { subject: "재무", finishedAt: NOW, deadlineId: "d1" },
    { subject: "재무", finishedAt: NOW, deadlineId: "d2" },
    { subject: "재무", finishedAt: NOW },
    { subject: "재무", finishedAt: YESTERDAY, deadlineId: "d1" },
  ];
  const goal = focusGoal(2, records, NOW, { subject: "재무", link: { deadlineId: "d1" } }, 30);
  assert.deepEqual(goal, { hours: 2, rounds: 4, done: 1 });
});

test("일정 연결이 없으면 활동이나 과목으로 센다", () => {
  const records = [
    { subject: "재무", finishedAt: NOW, deadlineId: "d1" },
    { subject: "재무", finishedAt: NOW },
    { subject: "공모전", finishedAt: NOW, activityId: "a1" },
  ];
  assert.equal(focusGoal(1, records, NOW, { subject: "재무", link: {} }, 30).done, 2);
  assert.equal(focusGoal(1, records, NOW, { subject: "공모전", link: { activityId: "a1" } }, 30).done, 1);
});

test("막대 숫자는 시간 단위 소수 한 자리다", () => {
  assert.equal(hoursLabel(25), "0.4");
  assert.equal(hoursLabel(60), "1");
  assert.equal(hoursLabel(100), "1.7");
});
