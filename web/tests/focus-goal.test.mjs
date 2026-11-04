// 실행: node --test tests/focus-goal.test.mjs
// 오늘의 한 가지 목표 시간과 오늘 집중한 시간을 비교하는 계산을 검사한다.
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
const { focusGoal, hoursFromMinutes, hoursLabel, parseFocusHours, parseGoalHours, stepFocusHours, suggestHours } = loaded.exports;

const NOW = new Date(2026, 10, 4, 15).getTime();
const YESTERDAY = new Date(2026, 10, 3, 15).getTime();

test("남은 시간을 30분 단위로 올림하고 12시간을 넘지 않는다", () => {
  assert.equal(suggestHours({ hours: 2, doneMinutes: 0 }), 2);
  assert.equal(suggestHours({ hours: 2, doneMinutes: 60 }), 1);
  assert.equal(suggestHours({ hours: 2, doneMinutes: 110 }), 0.5); // 10분 남음
  assert.equal(suggestHours({ hours: 1.5, doneMinutes: 0 }), 1.5);
  assert.equal(suggestHours({ hours: 1.3, doneMinutes: 0 }), 1.5);
  assert.equal(suggestHours({ hours: 0.5, doneMinutes: 0 }), 0.5);
  assert.equal(suggestHours({ hours: 2, doneMinutes: 180 }), 1); // 이미 채움
  assert.equal(suggestHours({ hours: 8, doneMinutes: 0 }), 8);
  assert.equal(suggestHours({ hours: 20, doneMinutes: 0 }), 12);
});

test("집중 시간은 0.5~12시간, 30분 단위만 받는다", () => {
  for (const [text, hours] of [["0.5", 0.5], ["1", 1], [" 1.5 ", 1.5], ["2.5", 2.5], ["12", 12]]) {
    assert.equal(parseFocusHours(text), hours, text);
  }
  for (const bad of ["", " ", "0", "0.4", "1.3", "1.25", "12.5", "-1", "abc", "1시간", "Infinity"]) {
    assert.equal(parseFocusHours(bad), null, bad);
  }
});

test("버튼은 30분씩 움직이고 범위를 넘지 않는다", () => {
  assert.equal(stepFocusHours(1, 1), 1.5);
  assert.equal(stepFocusHours(1.5, -1), 1);
  assert.equal(stepFocusHours(0.5, -1), 0.5);
  assert.equal(stepFocusHours(12, 1), 12);
});

test("다시 시작할 시간은 끝난 시간과 같고 옛 25분은 30분이 된다", () => {
  assert.equal(hoursFromMinutes(90), 1.5);
  assert.equal(hoursFromMinutes(180), 3);
  assert.equal(hoursFromMinutes(25), 0.5);
});

test("주소 값은 쓸 수 있는 시간만 받는다", () => {
  assert.equal(parseGoalHours("2"), 2);
  assert.equal(parseGoalHours("0.5"), 0.5);
  for (const bad of [null, "", "0", "-1", "abc", "25", "Infinity"]) assert.equal(parseGoalHours(bad), null);
});

test("오늘 끝낸 그 일정의 시간만 더한다", () => {
  const records = [
    { subject: "재무", minutes: 60, finishedAt: NOW, deadlineId: "d1" },
    { subject: "재무", minutes: 25, finishedAt: NOW, deadlineId: "d1" },
    { subject: "재무", minutes: 60, finishedAt: NOW, deadlineId: "d2" },
    { subject: "재무", minutes: 60, finishedAt: NOW },
    { subject: "재무", minutes: 60, finishedAt: YESTERDAY, deadlineId: "d1" },
  ];
  const goal = focusGoal(2, records, NOW, { subject: "재무", link: { deadlineId: "d1" } });
  assert.deepEqual(goal, { hours: 2, doneMinutes: 85 }); // 옛 25분 기록도 더한다
});

test("일정 연결이 없으면 활동이나 과목으로 센다", () => {
  const records = [
    { subject: "재무", minutes: 60, finishedAt: NOW, deadlineId: "d1" },
    { subject: "재무", minutes: 120, finishedAt: NOW },
    { subject: "공모전", minutes: 60, finishedAt: NOW, activityId: "a1" },
  ];
  assert.equal(focusGoal(1, records, NOW, { subject: "재무", link: {} }).doneMinutes, 180);
  assert.equal(focusGoal(1, records, NOW, { subject: "공모전", link: { activityId: "a1" } }).doneMinutes, 60);
});

test("막대 숫자는 시간 단위 소수 한 자리다", () => {
  assert.equal(hoursLabel(25), "0.4");
  assert.equal(hoursLabel(60), "1");
  assert.equal(hoursLabel(100), "1.7");
});
