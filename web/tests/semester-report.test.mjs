// 실행: node --test tests/semester-report.test.mjs
// 학기 결산서 계산을 시안 숫자·손 계산과 비교한다.
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
const {
  EXAMPLE_COURSES,
  buildCourseReport,
  collectCourseInputs,
  formatHours,
  isSemesterOver,
  recordedWeeks,
  reportWeek,
  semesterRecords,
} = load("semester-report");

const at = (ymd) => new Date(`${ymd}T12:00:00`).getTime();
const record = (subject, ymd, minutes = 60, extra = {}) => ({ subject, minutes, finishedAt: at(ymd), ...extra });

test("예시 데이터는 시안 05의 숫자와 같다", () => {
  const report = buildCourseReport(EXAMPLE_COURSES);
  assert.equal(report.totalHours, 187);
  assert.equal(report.earnedCredits, 15);
  assert.equal(report.gpa.toFixed(2), "4.10");
  assert.equal(formatHours(report.hoursPerCredit), "12.5");
  assert.deepEqual(
    report.courses.map((c) => [c.course, c.value, formatHours(c.hoursPerCredit)]),
    [
      ["데이터과학입문", 52, "8.7"],
      ["조직행동론", 50, "8"],
      ["마케팅원론", 36, "12.7"],
      ["회계원리", 26, "15.7"],
      ["경영통계", 20, "17.3"],
    ],
  );
  assert.equal(report.courses[0].badge, "best");
  assert.equal(report.courses[0].barPercent, 100);
  assert.equal(report.courses[4].badge, "worst");
  assert.equal(report.courses[1].badge, undefined);
});

test("기록이나 성적이 없는 과목은 가성비 없이 맨 뒤로 가고 합계에는 들어간다", () => {
  const report = buildCourseReport([
    { course: "기록 없음", minutes: 0, credits: 3, grade: "A0" },
    { course: "성적 없음", minutes: 120, credits: 3 },
    { course: "둘 다 있음", minutes: 180, credits: 3, grade: "B0" },
  ]);
  assert.deepEqual(report.courses.map((c) => [c.course, c.value, c.badge]), [
    ["둘 다 있음", 300, undefined],
    ["기록 없음", null, "no-record"],
    ["성적 없음", null, "no-grade"],
  ]);
  assert.equal(report.totalHours, 5);
  assert.equal(report.earnedCredits, 9);
  assert.equal(report.hoursPerCredit, 5 / 9);
  assert.equal(report.gpa, 3.5); // (4 + 3) ÷ 2, 성적 없는 과목은 평점에서 뺀다
});

test("학점이 다르면 평점과 학점당 시간에 반영하고, F는 얻은 학점에서 뺀다", () => {
  const report = buildCourseReport([
    { course: "a", minutes: 120, credits: 2, grade: "A+" },
    { course: "b", minutes: 240, credits: 4, grade: "F" },
  ]);
  assert.equal(report.earnedCredits, 2);
  assert.equal(report.gpa, 1.5); // (4.5 × 2 + 0 × 4) ÷ 6
  assert.equal(report.hoursPerCredit, 1);
  assert.equal(report.courses[0].value, 450);
  assert.equal(report.courses[1].value, 0);
  assert.equal(report.courses[1].barPercent, 0);
  assert.equal(report.courses[1].badge, "worst");
});

test("뺀 과목은 합계와 목록에서 빠지고, 아무것도 없으면 숫자를 내지 않는다", () => {
  const report = buildCourseReport([
    { course: "토익", minutes: 600, credits: 0 },
    { course: "회계", minutes: 60, credits: 3, grade: "A0" },
  ]);
  assert.equal(report.totalHours, 1);
  assert.deepEqual(report.excluded, ["토익"]);
  assert.equal(report.courses.length, 1);
  assert.equal(report.courses[0].badge, undefined); // 과목이 하나면 1위·낮음 표시가 없다

  const empty = buildCourseReport([]);
  assert.equal(empty.hoursPerCredit, null);
  assert.equal(empty.gpa, null);
});

test("이번 학기 수업 기록만 남긴다", () => {
  const deadlines = [{ id: "p", course: "한국은행", source: "posting" }];
  const kept = semesterRecords(
    [
      record("회계", "2026-09-01"),
      record("회계", "2026-08-30"), // 학기 전
      record("회계", "2026-12-21"), // 16주차 뒤
      record("공모전", "2026-09-02", 60, { activityId: "a" }),
      record("한국은행", "2026-09-03", 60, { deadlineId: "p" }),
    ],
    deadlines,
  );
  assert.equal(kept.length, 1);
  assert.equal(kept[0].finishedAt, at("2026-09-01"));
});

test("기록한 주 수를 세고, 지금 주차는 1~16 안이다", () => {
  assert.equal(recordedWeeks([record("a", "2026-09-01"), record("a", "2026-09-02"), record("a", "2026-09-08")]), 2);
  assert.equal(reportWeek("2026-08-01"), 1);
  assert.equal(reportWeek("2026-11-05"), 10);
  assert.equal(reportWeek("2027-01-05"), 16);
  assert.equal(isSemesterOver("2026-12-20"), false);
  assert.equal(isSemesterOver("2026-12-21"), true);
});

test("시간표·일정·기록의 과목을 합치고 공고는 빼며, 안 넣은 학점은 3이다", () => {
  const inputs = collectCourseInputs(
    [{ course: "회계 " }, { course: "회계" }],
    [{ id: "1", course: "통계" }, { id: "2", course: "한국은행", source: "posting" }],
    [record("회계", "2026-09-01", 30), record("회계 ", "2026-09-02", 30), record("토익", "2026-09-03", 90)],
    { 통계: { credits: 2, grade: "A0" }, 토익: { credits: 0 } },
  );
  assert.deepEqual(inputs, [
    { course: "회계", minutes: 60, credits: 3 },
    { course: "통계", minutes: 0, credits: 2, grade: "A0" },
    { course: "토익", minutes: 90, credits: 0 },
  ]);
});

test("과목 이름이 constructor여도 기본 학점을 쓴다", () => {
  const [input] = collectCourseInputs([{ course: "constructor" }], [], [], {});
  assert.deepEqual(input, { course: "constructor", minutes: 0, credits: 3 });
});

test("시간은 0.0 없이 적는다", () => {
  assert.equal(formatHours(8), "8");
  assert.equal(formatHours(12.47), "12.5");
});
