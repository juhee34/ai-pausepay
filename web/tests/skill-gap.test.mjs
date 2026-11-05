// 실행: node --test tests/skill-gap.test.mjs
// 역량 공백 지도 계산을 시안 04의 숫자와 비교한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const filename = fileURLToPath(new URL("../src/lib/skill-gap.ts", import.meta.url));
const loaded = new Module(filename);
loaded._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  filename,
);
const { buildGapMap, formatFocusTime, statusOf } = loaded.exports;

// 계산 규칙만 시험하는 이름표라 옛 임시 표 이름을 그대로 둔다. 실제 표로 하는 시험은 tests/competencies.test.mjs.
const REQUIRED = ["시장 분석", "기획력", "콘텐츠 제작", "데이터 분석", "발표·설득", "협업", "문제 정의", "커뮤니케이션"];
const activities = [
  { id: "a", title: "교내 마케팅 공모전", experience: true },
  { id: "b", title: "학생회 홍보팀", experience: true },
  { id: "c", title: "영어회화 스터디", experience: true },
  { id: "d", title: "경영통계 팀과제", experience: true },
];
const receipts = [
  { activityId: "a", competencies: ["시장 분석", "기획력"] },
  { activityId: "a", competencies: ["시장 분석", "기획력", "협업"] },
  { activityId: "a", competencies: ["발표·설득"] },
  { activityId: "b", competencies: ["콘텐츠 제작", "커뮤니케이션"] },
  { activityId: "b", competencies: ["협업", "커뮤니케이션"] },
  { activityId: "c", competencies: ["외국어"] },
];
const records = [
  { activityId: "a", minutes: 42 * 60 },
  { activityId: "b", minutes: 31 * 60 },
  { activityId: "c", minutes: 18 * 60 },
  { activityId: "d", minutes: 26 * 60 },
  { minutes: 500 }, // 활동과 상관없는 공부
];

test("시안 04의 칸 숫자와 같다", () => {
  const map = buildGapMap(REQUIRED, activities, receipts, records);
  const cell = (name) => map.cells.find((c) => c.name === name);
  assert.deepEqual(map.counts, { 채움: 4, "보강 필요": 2, "비어 있음": 2 });
  assert.deepEqual(cell("시장 분석"), { name: "시장 분석", status: "채움", receipts: 2, minutes: 42 * 60 });
  assert.deepEqual(cell("콘텐츠 제작"), { name: "콘텐츠 제작", status: "보강 필요", receipts: 1, minutes: 31 * 60 });
  assert.equal(cell("협업").minutes, 73 * 60); // 두 활동을 더한다
  assert.equal(cell("커뮤니케이션").minutes, 31 * 60); // 같은 활동은 한 번만
  assert.equal(cell("데이터 분석").status, "비어 있음");
  assert.equal(cell("데이터 분석").minutes, 0);
});

test("먼저 채울 칸은 비어 있는 칸부터 최대 4개, 기록 없는 시간을 한 번만 권한다", () => {
  const { firstToFill } = buildGapMap(REQUIRED, activities, receipts, records);
  assert.deepEqual(
    firstToFill.map((f) => f.name),
    ["데이터 분석", "문제 정의", "콘텐츠 제작", "발표·설득"],
  );
  assert.equal(firstToFill[0].activityId, "d");
  assert.ok(firstToFill[0].hint.includes("경영통계 팀과제(26시간)"));
  assert.equal(firstToFill[1].activityId, undefined);
  assert.equal(firstToFill[2].activityId, "b");
  assert.equal(firstToFill[3].activityId, "a");
});

test("활동 기록은 시간이 많은 순서이고 영수증 수와 역량을 모은다", () => {
  const { lines } = buildGapMap(REQUIRED, activities, receipts, records);
  assert.deepEqual(lines.map((l) => l.id), ["a", "b", "d", "c"]);
  assert.equal(lines[0].receipts, 3);
  assert.deepEqual(lines[0].competencies, ["시장 분석", "기획력", "협업", "발표·설득"]);
  assert.equal(lines[2].receipts, 0);
});

test("공고만 넣은 활동은 빼고, 시간이나 영수증이 생기면 넣는다", () => {
  const posting = { id: "p", title: "공고", experience: false };
  assert.equal(buildGapMap(REQUIRED, [posting], [], []).lines.length, 0);
  assert.equal(buildGapMap(REQUIRED, [posting], [], [{ activityId: "p", minutes: 25 }]).lines.length, 1);
  assert.equal(buildGapMap(REQUIRED, [posting], [{ activityId: "p", competencies: ["협업"] }], []).lines.length, 1);
});

test("연결이 없거나 지워진 활동의 영수증도 장 수에 넣고 따로 모은다", () => {
  const map = buildGapMap(REQUIRED, [], [{ competencies: ["협업"] }, { activityId: "gone", competencies: ["협업"] }], [
    { activityId: "gone", minutes: 600 },
  ]);
  const cell = map.cells.find((c) => c.name === "협업");
  assert.equal(cell.receipts, 2);
  assert.equal(cell.minutes, 0);
  assert.deepEqual(map.loose, { receipts: 2, competencies: ["협업"] });
});

test("상태 경계와 시간 표시", () => {
  assert.equal(statusOf(0), "비어 있음");
  assert.equal(statusOf(1), "보강 필요");
  assert.equal(statusOf(2), "채움");
  assert.equal(statusOf(5), "채움");
  assert.equal(formatFocusTime(0), "0시간");
  assert.equal(formatFocusTime(25), "25분");
  assert.equal(formatFocusTime(60), "1시간");
  assert.equal(formatFocusTime(100), "1.7시간");
});
