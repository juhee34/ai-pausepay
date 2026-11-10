// 실행: node --test tests/semester-flow.test.mjs
// 학기 결산서의 시간 흐름 계산을 시안 숫자·손 계산과 비교한다.
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
  mod.require = (id) => (id.startsWith("./") ? load(id.slice(2)) : original(id));
  mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return mod.exports;
}
const flowLib = load("semester-flow");
const reportLib = load("semester-report");
const {
  EXAMPLE_FLOW,
  adviceFor,
  buildSemesterFlow,
  busiestWeekOf,
  examShareOf,
  examWeeksOf,
  leadLabel,
  procrastinationOf,
  weeklyHours,
} = flowLib;

const at = (ymd) => new Date(`${ymd}T12:00:00`).getTime();
const deadline = (id, date, kind = "과제", extra = {}) => ({ id, course: "회계", title: `일 ${id}`, date, kind, ...extra });

test("예시는 시안 06의 숫자와 같다", () => {
  assert.equal(EXAMPLE_FLOW.weekly.reduce((a, b) => a + b, 0), 187);
  assert.deepEqual(examShareOf(EXAMPLE_FLOW.weekly, [8, 15]), { weeks: [8, 15], hours: 44, percent: 24 });
  assert.deepEqual(busiestWeekOf(EXAMPLE_FLOW.weekly), { week: 8, hours: 22 }); // 같으면 앞 주
});

test("주차별 시간은 1~16주차 칸에 시간 단위로 더한다", () => {
  const weekly = weeklyHours([
    { minutes: 90, finishedAt: at("2026-08-31") }, // 1주차
    { minutes: 30, finishedAt: at("2026-09-06") }, // 1주차 일요일
    { minutes: 60, finishedAt: at("2026-12-14") }, // 16주차
    { minutes: 60, finishedAt: at("2026-12-21") }, // 학기 뒤
  ]);
  assert.equal(weekly.length, 16);
  assert.equal(weekly[0], 2);
  assert.equal(weekly[15], 1);
  assert.equal(weekly.reduce((a, b) => a + b, 0), 3);
});

test("시험 주는 중간·기말만, 공고는 빼고, 겹치면 한 번", () => {
  assert.deepEqual(
    examWeeksOf([
      deadline("1", "2026-10-20", "중간"),
      deadline("2", "2026-10-22", "중간"),
      deadline("3", "2026-12-08", "기말"),
      deadline("4", "2026-11-03", "과제"),
      deadline("5", "2026-11-10", "기말", { source: "posting" }),
    ]),
    [8, 15],
  );
  assert.equal(examShareOf([0, 0], [1]), null);
  assert.equal(examShareOf([1, 2], []), null);
});

test("가장 많이 미룬 과제는 첫 집중이 마감에 가장 가까운 과제다", () => {
  const deadlines = [
    deadline("a", "2026-10-10", "과제", { startDate: "2026-09-19" }),
    deadline("b", "2026-10-20"),
    deadline("c", "2026-10-25", "기말"), // 과제가 아니면 세지 않는다
  ];
  const result = procrastinationOf(
    [
      { minutes: 60, finishedAt: at("2026-10-09"), deadlineId: "a" },
      { minutes: 60, finishedAt: at("2026-10-08"), deadlineId: "a" }, // a의 첫 집중: 마감 2일 전
      { minutes: 60, finishedAt: at("2026-10-12"), deadlineId: "b" }, // b: 8일 전
      { minutes: 60, finishedAt: at("2026-10-24"), deadlineId: "c" },
    ],
    deadlines,
  );
  assert.deepEqual(result, { course: "회계", title: "일 a", leadDays: 2, averageLead: 5, noticeDays: 21 });
  assert.equal(procrastinationOf([{ minutes: 60, finishedAt: at("2026-10-09") }], deadlines), null);
});

test("마감 뒤에 시작한 과제는 음수이고 글자로는 '뒤'다", () => {
  const result = procrastinationOf([{ minutes: 60, finishedAt: at("2026-10-12"), deadlineId: "b" }], [deadline("b", "2026-10-10")]);
  assert.equal(result.leadDays, -2);
  assert.equal(result.noticeDays, undefined);
  assert.equal(leadLabel(-2), "마감 2일 뒤");
  assert.equal(leadLabel(0), "마감 당일");
  assert.equal(leadLabel(5), "마감 5일 전");
});

test("조언은 시안 예시처럼 기록에서 나온 사실이 있을 때만 나온다", () => {
  const report = reportLib.buildCourseReport(reportLib.EXAMPLE_COURSES);
  const advice = adviceFor(report, EXAMPLE_FLOW);
  assert.equal(advice.length, 2); // 평균 5일 전 시작이라 과제 조언은 없다
  assert.equal(advice[0].strong, "경영통계는 과제와 시험 준비를 더 일찍 시작해 보세요.");
  assert.equal(advice[0].rest, "시간은 가장 많이 썼는데(52시간) 가성비는 가장 낮았어요.");
  assert.equal(advice[1].rest, "두 주에 몰린 24%를 앞쪽 주차로 나눌 수 있어요.");

  const empty = adviceFor(reportLib.buildCourseReport([]), buildSemesterFlow([], []));
  assert.deepEqual(empty, []);
});

test("과제를 늦게 시작하면 과제 조언이 나온다", () => {
  const flow = { ...EXAMPLE_FLOW, examShare: null, procrastination: { course: "a", title: "b", leadDays: 0, averageLead: 1 } };
  const advice = adviceFor(reportLib.buildCourseReport([]), flow);
  assert.deepEqual(advice, [
    { strong: "과제는 마감 일주일 전에 첫 집중을 해 보세요.", rest: "이번 학기 과제는 평균 마감 1일 전에 시작했어요." },
  ]);
});
