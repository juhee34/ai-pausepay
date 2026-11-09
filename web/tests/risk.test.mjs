// 실행: node --test tests/risk.test.mjs
// 학기 리스크 지도 계산을 손 계산과 비교한다 (web/src/lib/risk.ts 맨 위 확인용 예시).
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
const {
  buildRiskMap, busiestWeek, daysLeftInWeek, exampleDeadlines, hoursOf, isStudyHours, kindHoursOf, kindSummary,
  spentMinutesByDeadline, weekNumberOf, worstWeek, SEMESTER,
} = load("risk");

const TODAY = "2026-11-09"; // 월요일, 11주차
const exam = (id, course, date) => ({ id, title: "기말고사", course, date, kind: "기말" });
const week = (map, n) => map.weeks.find((w) => w.week === n);
const FINALS = [exam("f1", "마케팅원론", "2026-12-08"), exam("f2", "재무관리", "2026-12-09"), exam("f3", "경영통계", "2026-12-10")];

test("주차와 이번 주에 남은 날, 예상 시간 기본값", () => {
  assert.equal(weekNumberOf("2026-09-01"), 1);
  assert.equal(weekNumberOf(TODAY), 11);
  assert.equal(weekNumberOf("2026-12-08"), 15);
  assert.equal(daysLeftInWeek("2026-11-09"), 7); // 월
  assert.equal(daysLeftInWeek("2026-11-13"), 3); // 금
  assert.equal(daysLeftInWeek("2026-11-15"), 1); // 일
  assert.equal(hoursOf({ kind: "기말" }), 8);
  assert.equal(hoursOf({ kind: "과제", hours: 5 }), 5);
});

test("그대로 두면: 15주차 기말 3개 24시간이 일주일 14시간을 10시간 넘는다", () => {
  const map = buildRiskMap(FINALS, TODAY, "now", { studyHours: { weekly: 14 } });
  assert.deepEqual(map.weeks.map((w) => w.week), [11, 12, 13, 14, 15, 16]);
  assert.equal(week(map, 15).total, 24);
  assert.equal(week(map, 15).capacity, 14);
  assert.equal(week(map, 15).over, 10);
  assert.equal(map.shortage, 10);
  assert.equal(map.need, 24);
  assert.equal(worstWeek(map).week, 15);
});

test("넘치지 않게 나누면: 30%는 시험 주에 남기고 넘친 10시간을 14주차로 당긴다", () => {
  const map = buildRiskMap(FINALS, TODAY, "spread", { studyHours: { weekly: 14 } });
  assert.equal(week(map, 15).total, 14);
  assert.equal(week(map, 14).total, 10);
  assert.equal(map.shortage, 0);
  assert.equal(worstWeek(map), null);
  assert.equal(map.need, 24); // 합계는 그대로
  assert.ok(week(map, 14).items.every((item) => item.prep && item.dueWeek === 15));
  // 시험마다 시험 주에 최소 2.5시간(30%)은 남는다
  for (const item of week(map, 15).items) assert.ok(item.hours >= 2.5, `${item.course} ${item.hours}`);
});

test("넘친 만큼만 당기고, 그래도 모자라면 남은 넘침을 보여 준다", () => {
  const map = buildRiskMap(FINALS, TODAY, "spread", { studyHours: { weekly: 2 } });
  // 이번 주부터 15주차까지 5주 × 2시간 = 10시간에 시험 주 30% 7.5시간이 이미 들어가 있어 다 담을 수 없다
  assert.ok(map.shortage > 0);
  assert.equal(map.need, 24);
  for (const w of map.weeks.filter((x) => x.week < 15)) assert.ok(w.total <= w.capacity, `${w.week}주차`);
});

test("시작일을 넣은 할 일은 시작 주부터 마감 주까지 고르게 나눈다", () => {
  const team = { id: "t", title: "팀 프로젝트", course: "마케팅원론", date: "2026-12-04", kind: "과제", hours: 12, startDate: "2026-11-16" };
  const map = buildRiskMap([team], TODAY, "now", { studyHours: { weekly: 14 } });
  assert.equal(week(map, 12).total, 4);
  assert.equal(week(map, 13).total, 4);
  assert.equal(week(map, 14).total, 4);
  assert.equal(week(map, 11).total, 0);
  assert.equal(week(map, 12).items[0].prep, true);
  assert.equal(week(map, 14).items[0].prep, false);
});

test("시작일 전 주로는 당기지 않는다", () => {
  const team = { id: "t", title: "팀 프로젝트", course: "마케팅원론", date: "2026-11-27", kind: "과제", hours: 20, startDate: "2026-11-23" };
  const map = buildRiskMap([team], TODAY, "spread", { studyHours: { weekly: 14 } });
  assert.equal(week(map, 12).total, 0);
  assert.equal(week(map, 13).total, 20);
  assert.equal(week(map, 13).over, 6);
});

test("집중 모드로 그 일정에 쓴 시간은 남은 공부 시간에서 뺀다", () => {
  const records = [
    { deadlineId: "f1", minutes: 180 },
    { deadlineId: "f1", minutes: 60 },
    { minutes: 500 }, // 일정과 상관없는 공부
    { deadlineId: "f2", minutes: 9000 }, // 예상보다 많이 해도 0시간 아래로 내려가지 않는다
  ];
  const spent = spentMinutesByDeadline(records);
  assert.deepEqual(spent, { f1: 240, f2: 9000 });
  const map = buildRiskMap(FINALS, TODAY, "now", { studyHours: { weekly: 14 }, spentMinutes: spent });
  assert.equal(week(map, 15).total, 4 + 8); // 마케팅 8−4, 재무 다 함, 통계 8
  assert.equal(map.spent, 4 + 8);
  assert.equal(map.rows.find((r) => r.course === "재무관리"), undefined);
});

test("공고 일정, 끝낸 일, 지난 일은 빼고, 학기 뒤 일정과 공고는 몇 개 빠졌는지 센다", () => {
  const map = buildRiskMap(
    [
      ...FINALS,
      { title: "서류 마감", course: "삼성전자 인턴", date: "2026-11-17", kind: "기타", source: "posting" },
      { title: "면접", course: "삼성전자 인턴", date: "2026-11-24", kind: "기타", source: "posting" },
      { title: "기말 리포트", course: "교양 글쓰기", date: "2026-12-21", kind: "과제" }, // 17주차
      { title: "과제 1", course: "경영통계", date: "2026-11-10", kind: "과제", done: true },
      { title: "과제 0", course: "경영통계", date: "2026-11-02", kind: "과제" },
    ],
    TODAY,
    "now",
  );
  assert.deepEqual(map.excluded, { postings: 2, afterSemester: 1 });
  assert.deepEqual(map.rows.map((r) => r.course).sort(), ["경영통계", "마케팅원론", "재무관리"]);
  assert.equal(map.need, 24);
});

test("이번 주는 남은 날만큼만 공부할 수 있다", () => {
  const map = buildRiskMap(FINALS, "2026-11-13", "now", { studyHours: { weekly: 14 } }); // 금요일
  assert.equal(map.weeks[0].capacity, 6); // 14 × 3/7
  assert.equal(map.weeks[1].capacity, 14);
});

test("예시 데이터는 오늘 기준이라 시간이 지나도 비지 않는다", () => {
  for (const today of ["2026-09-07", TODAY, "2026-11-30"]) {
    const examples = exampleDeadlines(today);
    assert.ok(examples.every((d) => d.date >= today), today);
    const map = buildRiskMap(examples, today, "now");
    assert.ok(map.rows.length >= 4, today);
    assert.equal(map.excluded.postings, 1);
  }
  assert.equal(SEMESTER.lastWeek, 16);
});

test("내가 정한 종류별 시간이 기본값보다 먼저이고, 할 일에 직접 넣은 시간이 가장 먼저다", () => {
  const kinds = kindHoursOf({ exam: 12, quiz: 2 });
  assert.equal(kinds.중간, 12);
  assert.equal(kinds.기말, 12);
  assert.equal(kinds.퀴즈, 2);
  assert.equal(kinds.과제, 3); // 안 정한 칸은 기본값
  assert.equal(hoursOf({ kind: "기말" }, kinds), 12);
  assert.equal(hoursOf({ kind: "기말", hours: 5 }, kinds), 5);
  // 시험을 4시간으로 잡는 사람에겐 같은 기말 3개(12시간)가 14시간 안에 들어온다
  const relaxed = buildRiskMap(FINALS, TODAY, "now", { studyHours: { exam: 4, weekly: 14 } });
  assert.equal(week(relaxed, 15).total, 12);
  assert.equal(worstWeek(relaxed), null);
  // 일주일에 30시간 공부할 수 있으면 기본값으로도 몰리지 않는다
  assert.equal(worstWeek(buildRiskMap(FINALS, TODAY, "now", { studyHours: { weekly: 30 } })), null);
});

test("저장된 공부 시간 기준은 정해진 칸·범위·30분 단위만 받는다", () => {
  assert.equal(isStudyHours({}), true);
  assert.equal(isStudyHours({ exam: 6.5, weekly: 20 }), true);
  assert.equal(isStudyHours({ exam: 0 }), false);
  assert.equal(isStudyHours({ exam: 1.3 }), false);
  assert.equal(isStudyHours({ weekly: 81 }), false);
  assert.equal(isStudyHours({ exam: "8" }), false);
  assert.equal(isStudyHours({ sleep: 8 }), false);
  assert.equal(isStudyHours([]), false);
  assert.equal(isStudyHours(null), false);
});

test("주마다 마감인 할 일 개수를 과목별·합계로 센다", () => {
  const items = [
    ...FINALS,
    { id: "q", title: "퀴즈 4", course: "경영통계", date: "2026-12-07", kind: "퀴즈" },
    { id: "a", title: "과제 2", course: "마케팅원론", date: "2026-11-20", kind: "과제" },
  ];
  const map = buildRiskMap(items, TODAY, "now", { studyHours: { weekly: 14 } });
  assert.equal(week(map, 15).due.length, 4);
  assert.equal(week(map, 12).due.length, 1);
  assert.deepEqual(map.rows.find((r) => r.course === "경영통계").due, [0, 0, 0, 0, 2, 0]);
  assert.equal(kindSummary(week(map, 15).due), "시험 3 · 퀴즈 1");
  assert.equal(busiestWeek(map).week, 15);
  // 미리 나눠도 마감 개수는 마감 주에 그대로 남는다
  const spread = buildRiskMap(items, TODAY, "spread", { studyHours: { weekly: 14 } });
  assert.equal(week(spread, 15).due.length, 4);
  assert.equal(week(spread, 14).due.length, 0);
});
