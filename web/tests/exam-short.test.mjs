// 실행: node --test tests/exam-short.test.mjs
// 단답형 채점과 AI 답 형식 검사를 확인한다. AI를 부르지 않는다.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

function load(relative) {
  const filename = fileURLToPath(new URL(`../src/${relative}`, import.meta.url));
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = (name) => (name === "./grading" ? load("app/exam/grading.ts") : original(name));
  mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return mod.exports;
}
const { isShortAnswerCorrect, normalizeAnswer } = load("app/exam/grading.ts");
const { normalizeExamPack } = load("app/exam/schema.ts");

test("띄어쓰기, 대소문자, 문장 부호, 전각 글자는 무시한다", () => {
  const accepted = ["기회비용", "Opportunity Cost"];
  for (const input of ["기회비용", " 기회 비용 ", "기회비용.", "opportunity cost", "OPPORTUNITY-COST", "ｏｐｐｏｒｔｕｎｉｔｙ cost"]) {
    assert.equal(isShortAnswerCorrect(input, accepted), true, input);
  }
});

test("글자가 다르거나 일부만 같으면 틀리고, 빈 답은 틀린다", () => {
  const accepted = ["기회비용"];
  for (const input of ["기회", "비용", "매몰비용", "기회비용이다", "", "   ", "...", "?"]) {
    assert.equal(isShortAnswerCorrect(input, accepted), false, input);
  }
  assert.equal(isShortAnswerCorrect("아무 답", ["..."]), false); // 글자가 없는 정답은 맞을 수 없다
  assert.equal(normalizeAnswer("A-1 b"), "a1b");
  assert.equal(isShortAnswerCorrect("35", ["3.5"]), false); // 숫자 사이의 점은 남긴다
  assert.equal(isShortAnswerCorrect("3.5.", ["3.5"]), true); // 문장 끝의 점은 지운다
  assert.equal(isShortAnswerCorrect("1,000", ["1000"]), true); // 천 단위 쉼표는 지운다
});

const summary = ["가", "나", "다", "라", "마"];
const multiple = (n) => ({ number: n, type: "multiple", question: `문제 ${n}`, choices: ["a", "b", "c", "d"], answerIndex: 1, acceptedAnswers: [], explanation: "해설" });
const ox = (n) => ({ number: n, type: "ox", question: `문제 ${n}`, choices: ["O", "X"], answerIndex: 0, acceptedAnswers: [], explanation: "해설" });
const short = (n, extra = {}) => ({ number: n, type: "short", question: `문제 ${n}`, choices: [], answerIndex: 0, acceptedAnswers: ["기회비용"], explanation: "해설", ...extra });
const pack = (questions) => ({ summary, terms: [], questions });
const full = () => [1, 2, 3, 4, 5].map(multiple).concat([ox(6), ox(7), short(8), short(9), short(10)]);

test("객관식, OX, 단답형이 모두 있어야 쓴다", () => {
  const result = normalizeExamPack(pack(full()));
  assert.equal(result.questions.length, 10);
  assert.deepEqual(result.questions.map((q) => q.type).filter((t) => t === "short").length, 3);
  const noShort = [1, 2, 3, 4, 5, 6, 7, 8].map(multiple).concat([ox(9), ox(10)]);
  assert.equal(normalizeExamPack(pack(noShort)), null);
  const onlyShort = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => short(n));
  assert.equal(normalizeExamPack(pack(onlyShort)), null);
});

test("단답형 정답은 다듬고 겹치는 표현을 뺀다", () => {
  const questions = full();
  questions[7] = short(8, { acceptedAnswers: [" 기회비용 ", "기회 비용", "opportunity cost", ""] });
  const q = normalizeExamPack(pack(questions)).questions[7];
  assert.deepEqual(q.acceptedAnswers, ["기회비용", "opportunity cost"]);
  assert.deepEqual(q.choices, []);
});

test("단답형 형식이 어긋나면 쓰지 않는다", () => {
  for (const bad of [
    { acceptedAnswers: [] },
    { acceptedAnswers: ["  ", "..."] },
    { acceptedAnswers: ["가".repeat(61)] },
    { choices: ["보기"] },
  ]) {
    const questions = full();
    questions[7] = short(8, bad);
    assert.equal(normalizeExamPack(pack(questions)), null, JSON.stringify(bad));
  }
});

test("객관식의 보기를 섞어도 정답 내용은 그대로이고 정답 표현 칸은 비운다", () => {
  const questions = full();
  questions[0] = { ...multiple(1), acceptedAnswers: ["무시됨"] };
  const q = normalizeExamPack(pack(questions)).questions[0];
  assert.equal(q.choices[q.answerIndex], "b");
  assert.deepEqual(q.acceptedAnswers, []);
});
