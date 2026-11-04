// 실행: node --test tests/score-sheet.test.mjs
// 점수표 계산과 표준편차로 구한 퍼진 정도를 손 계산과 비교한다. AI를 부르지 않는다.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

function load(relative) {
  const filename = fileURLToPath(new URL(`../src/lib/${relative}`, import.meta.url));
  const mod = new Module(filename);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return mod.exports;
}
const { MAX_SCORE_FILES, MAX_SCORE_FILES_BYTES, parseScoreList, rankOf, resolveScoreSheet, scoreFilesError, scoreStats } = load("score-sheet.ts");
const { estimateCuts, spreadFromItems } = load("grades.ts");

const base = { maxScore: "30", myScore: "", average: "", stdDev: "", scoreList: "" };

test("파일은 5개까지, 합쳐서 4MB까지 받는다", () => {
  assert.equal(MAX_SCORE_FILES, 5);
  assert.equal(scoreFilesError([1000]), null);
  assert.equal(scoreFilesError([1000, 2000, 3000, 4000, 5000]), null);
  assert.equal(scoreFilesError([MAX_SCORE_FILES_BYTES]), null);
  assert.match(scoreFilesError([]), /골라/);
  assert.match(scoreFilesError([1, 1, 1, 1, 1, 1]), /5개/);
  assert.match(scoreFilesError([MAX_SCORE_FILES_BYTES, 1]), /4MB/);
  assert.match(scoreFilesError([3 * 1024 * 1024, 2 * 1024 * 1024]), /4MB/);
});

test("쉼표, 공백, 줄바꿈으로 나누고 숫자가 아닌 조각을 알려 준다", () => {
  assert.deepEqual(parseScoreList("10, 20\n30 15.5;7").scores, [10, 20, 30, 15.5, 7]);
  assert.deepEqual(parseScoreList("10 홍길동 -3").invalid, ["홍길동", "-3"]);
});

test("평균과 표준편차가 손 계산과 같다", () => {
  assert.deepEqual(scoreStats([10, 20, 30]), { count: 3, mean: 20, stdDev: 8.16 });
  assert.deepEqual(scoreStats([5, 5]), { count: 2, mean: 5, stdDev: 0 });
  assert.deepEqual(scoreStats([]), { count: 0, mean: 0, stdDev: 0 });
});

test("같은 점수는 같은 등수이고, 나보다 높은 사람 수 + 1이다", () => {
  assert.deepEqual(rankOf(20, [10, 20, 30]), { rank: 2, count: 3, topPercent: 66.7 });
  assert.equal(rankOf(30, [30, 30, 10]).rank, 1);
  assert.equal(rankOf(10, [30, 30, 10]).rank, 3);
});

test("전체 점수만 있으면 평균과 표준편차, 등수를 계산한다", () => {
  const { values, error } = resolveScoreSheet({ ...base, myScore: "20", scoreList: "10, 20, 30" });
  assert.equal(error, null);
  assert.equal(values.average, 20);
  assert.equal(values.stdDev, 8.16);
  assert.equal(values.count, 3);
  assert.equal(values.rank, 2);
});

test("칸에 쓴 값이 전체 점수 계산보다 먼저다", () => {
  const { values } = resolveScoreSheet({ ...base, average: "18", stdDev: "5", scoreList: "10, 20, 30" });
  assert.equal(values.average, 18);
  assert.equal(values.stdDev, 5);
});

test("평균만 있어도 되고, 내 점수 없이도 된다", () => {
  const { values } = resolveScoreSheet({ ...base, average: "18" });
  assert.equal(values.average, 18);
  assert.equal(values.myScore, null);
  assert.equal(values.stdDev, null);
  assert.equal(values.rank, null);
});

test("잘못된 값은 저장하지 못하게 안내한다", () => {
  for (const bad of [
    { maxScore: "" },
    { maxScore: "0" },
    { average: "" },
    { average: "31" },
    { average: "18", myScore: "31" },
    { average: "18", stdDev: "-1" },
    { scoreList: "10" },
    { scoreList: "10 31" },
    { scoreList: "10 김철수" },
    { scoreList: Array(501).fill("1").join(" ") },
  ]) {
    const { values, error } = resolveScoreSheet({ ...base, ...bad });
    assert.equal(values, null, JSON.stringify(bad).slice(0, 40));
    assert.ok(error);
  }
});

const items = [
  { name: "중간", weight: 30 },
  { name: "출석", weight: 10 },
  { name: "기말", weight: 60 },
];

test("퍼진 정도는 시험과 기말의 배점으로 총점 기준으로 바꾼다", () => {
  // 중간 표준편차 6/30 = 20%. 기말도 20%로 본다. (6 + 60 × 0.2) ÷ 100 × 100 = 18
  assert.equal(spreadFromItems(items, { 중간: 6 }), 18);
  assert.equal(spreadFromItems(items, {}), null);
  assert.equal(spreadFromItems(items, { 중간: 0 }), null);
  assert.equal(spreadFromItems([{ name: "중간", weight: 30 }], { 중간: 6 }), null); // 기말 배점 없음
});

test("점수표의 표준편차가 있으면 임시 값 대신 쓴다", () => {
  const scores = { 중간: 24, 출석: 10 };
  const measured = estimateCuts(items, scores, { 중간: 18 }, undefined, { 중간: 6 });
  assert.equal(measured.spread, 18);
  assert.equal(measured.measuredSpread, true);
  const guessed = estimateCuts(items, scores, { 중간: 18 });
  assert.equal(guessed.spread, 10);
  assert.equal(guessed.measuredSpread, false);
  const bPlus = (r) => r.cuts.find((c) => c.grade === "B+").cut;
  assert.equal(bPlus(measured), bPlus(guessed)); // B+는 평균 자리라 같다
  const aPlus = (r) => r.cuts.find((c) => c.grade === "A+").cut;
  assert.ok(aPlus(measured) > aPlus(guessed));
});
