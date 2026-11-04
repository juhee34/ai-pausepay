// 실행: node --test tests/grades.test.mjs
// 기말 필요 점수 계산을 손 계산과 비교한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const filename = fileURLToPath(new URL("../src/lib/grades.ts", import.meta.url));
const loaded = new Module(filename);
loaded._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  filename,
);
const { DEFAULT_ESTIMATE, calcRequired, convertScore, estimateCuts, statusOf, upperZ } = loaded.exports;

const items100 = [
  { name: "중간", weight: 30 },
  { name: "과제", weight: 20 },
  { name: "퀴즈", weight: 10 },
  { name: "출석", weight: 10 },
  { name: "기말", weight: 30 },
];

test("총점 100인 과목은 시안 숫자와 같다", () => {
  const cases = [
    [{ 중간: 24, 과제: 18, 퀴즈: 8, 출석: 10 }, 83.3, "주의"],
    [{ 중간: 26, 과제: 18, 퀴즈: 10, 출석: 10 }, 70, "주의"],
    [{ 중간: 18, 과제: 12, 퀴즈: 6, 출석: 10 }, 130, "목표 초과"],
  ];
  for (const [scores, required, status] of cases) {
    const result = calcRequired(items100, scores, 85);
    assert.equal(result.required, required);
    assert.equal(result.status, status);
    assert.equal(result.total, 100);
    assert.equal(result.targetPoints, 85);
  }
});

test("총점 120인 과목은 목표를 비율로 바꿔 계산한다", () => {
  const items = [
    { name: "중간", weight: 40 },
    { name: "과제", weight: 40 },
    { name: "기말", weight: 40 },
  ];
  const result = calcRequired(items, { 중간: 30, 과제: 30 }, 85);
  assert.equal(result.total, 120);
  assert.equal(result.targetPoints, 102); // 120 × 85%
  assert.equal(result.requiredPoints, 42); // 102 - 60
  assert.equal(result.required, 105); // 42 ÷ 40 × 100
  assert.equal(result.status, "목표 초과");
  assert.equal(result.maxTotal, 83.3); // (60 + 40) ÷ 120
});

test("총점 80인 과목도 같은 비율로 계산한다", () => {
  const items = [
    { name: "중간", weight: 40 },
    { name: "기말", weight: 40 },
  ];
  const result = calcRequired(items, { 중간: 30 }, 75);
  assert.equal(result.targetPoints, 60); // 80 × 75%
  assert.equal(result.requiredPoints, 30);
  assert.equal(result.required, 75);
  assert.equal(result.status, "주의");
});

test("기말 없이 목표를 넘기면 0점, 입력 전이나 기말이 없으면 숫자를 내지 않는다", () => {
  const over = calcRequired(items100, { 중간: 30, 과제: 20, 퀴즈: 10, 출석: 10 }, 60);
  assert.equal(over.required, 0);
  assert.equal(over.reached, true);
  assert.equal(calcRequired(items100, {}, 85).required, null);
  assert.equal(calcRequired([{ name: "중간", weight: 30 }], { 중간: 20 }, 85).required, null);
});

test("목표를 넘는 경우 기말 만점일 때의 총점을 알려 준다", () => {
  const items = [
    { name: "중간", weight: 30 },
    { name: "과제", weight: 10 },
    { name: "퀴즈", weight: 20 },
    { name: "출석", weight: 10 },
    { name: "기말", weight: 30 },
  ];
  const result = calcRequired(items, { 중간: 24, 과제: 10, 퀴즈: 20, 출석: 10 }, 95);
  assert.equal(result.required, 103.3);
  assert.equal(result.status, "목표 초과");
  assert.equal(result.maxTotal, 94);
});

test("받은 점수를 배점으로 바꾼다", () => {
  assert.equal(convertScore(80, 100, 30), 24);
  assert.equal(convertScore(24, 30, 30), 24);
  assert.equal(convertScore(2, 3, 10), 6.67);
  assert.equal(convertScore(100, 100, 20), 20);
});

const itemsMine = [
  { name: "중간", weight: 30 },
  { name: "과제", weight: 10 },
  { name: "퀴즈", weight: 20 },
  { name: "출석", weight: 10 },
  { name: "기말", weight: 30 },
];
const scoresMine = { 중간: 24, 과제: 10, 퀴즈: 20, 출석: 10 };

test("z 값은 정규 분포표와 비슷하다", () => {
  assert.equal(upperZ(50), 0);
  assert.ok(Math.abs(upperZ(15) - 1.036) < 0.002);
  assert.ok(Math.abs(upperZ(30) - 0.524) < 0.002);
  assert.ok(Math.abs(upperZ(70) + 0.524) < 0.002);
});

test("중간 평균 18/30이면 학점별 컷과 기말 필요 점수가 손 계산과 같다", () => {
  const result = estimateCuts(itemsMine, scoresMine, { 중간: 18 });
  assert.equal(result.classMean, 76); // 18 + 10 + 20 + 10 + 기말 평균 18
  assert.equal(result.averageRate, 0.6);
  assert.deepEqual(result.assumedItems, ["과제", "퀴즈", "출석"]);
  const by = Object.fromEntries(result.cuts.map((c) => [c.grade, c]));
  assert.equal(by["A+"].cut, 86.4);
  assert.equal(by["A+"].result.required, 74.7); // (86.4 - 64) ÷ 30 × 100
  assert.equal(by.A0.cut, 81.2);
  assert.equal(by.A0.result.required, 57.3); // (81.2 - 64) ÷ 30 × 100
  assert.equal(by["B+"].cut, 76);
  assert.equal(by["B+"].result.required, 40);
});

test("평균이 없거나 기말이 없으면 추정하지 않는다", () => {
  assert.equal(estimateCuts(itemsMine, scoresMine, {}), null);
  assert.equal(estimateCuts([{ name: "중간", weight: 30 }], { 중간: 20 }, { 중간: 18 }), null);
});

test("내 점수를 모르는 항목은 입력한 평균의 비율로 본다", () => {
  const result = estimateCuts(itemsMine, { 중간: 24 }, { 중간: 18 });
  assert.equal(result.classMean, 60); // 모든 항목이 60%
  assert.deepEqual(result.assumedItems, ["과제", "퀴즈", "출석"]);
});

test("총점이 100이 아니어도 전체 평균을 100점 기준으로 바꾼다", () => {
  const items = [
    { name: "중간", weight: 40 },
    { name: "과제", weight: 40 },
    { name: "기말", weight: 40 },
  ];
  const result = estimateCuts(items, { 중간: 30, 과제: 30 }, { 중간: 20, 과제: 20 });
  assert.equal(result.classMean, 50);
  assert.equal(result.cuts.find((c) => c.grade === "B+").cut, 50);
});

test("추정 기준을 바꾸면 컷도 바뀌고, 컷은 0~100을 넘지 않는다", () => {
  const wide = estimateCuts(itemsMine, scoresMine, { 중간: 18 }, { ...DEFAULT_ESTIMATE, spread: 20 });
  assert.equal(wide.cuts.find((c) => c.grade === "A+").cut, 96.7);
  const huge = estimateCuts(itemsMine, scoresMine, { 중간: 18 }, { ...DEFAULT_ESTIMATE, spread: 40 });
  assert.equal(huge.cuts.find((c) => c.grade === "A+").cut, 100);
});

test("상태 경계값", () => {
  assert.equal(statusOf(100), "위험");
  assert.equal(statusOf(100.1), "목표 초과");
  assert.equal(statusOf(85), "위험");
  assert.equal(statusOf(70), "주의");
  assert.equal(statusOf(69.9), "여유");
});
