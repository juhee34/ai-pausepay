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
const { calcRequired, convertScore, statusOf } = loaded.exports;

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
    [{ 중간: 18, 과제: 12, 퀴즈: 6, 출석: 10 }, 130, "불가"],
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
  assert.equal(result.status, "불가");
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

test("받은 점수를 배점으로 바꾼다", () => {
  assert.equal(convertScore(80, 100, 30), 24);
  assert.equal(convertScore(24, 30, 30), 24);
  assert.equal(convertScore(2, 3, 10), 6.67);
  assert.equal(convertScore(100, 100, 20), 20);
});

test("상태 경계값", () => {
  assert.equal(statusOf(100), "위험");
  assert.equal(statusOf(100.1), "불가");
  assert.equal(statusOf(85), "위험");
  assert.equal(statusOf(70), "주의");
  assert.equal(statusOf(69.9), "여유");
});
