// 실행: node --test tests/save-pdf.test.mjs
// PDF 쪽을 어디서 자를지 정하는 계산을 검사한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const filename = fileURLToPath(new URL("../src/lib/save-pdf.ts", import.meta.url));
const loaded = new Module(filename);
loaded._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  filename,
);
const { pdfFileName, splitPages } = loaded.exports;

test("한 쪽에 들어가면 그대로 한 쪽이다", () => {
  assert.deepEqual(splitPages([{ top: 0, bottom: 50 }], 60, 100), [{ top: 0, bottom: 60 }]);
});

test("쪽 경계에 걸린 묶음은 자르지 않고 다음 쪽으로 넘긴다", () => {
  const blocks = [
    { top: 0, bottom: 60 },
    { top: 70, bottom: 130 },
    { top: 140, bottom: 180 },
  ];
  assert.deepEqual(splitPages(blocks, 180, 100), [
    { top: 0, bottom: 70 },
    { top: 70, bottom: 140 },
    { top: 140, bottom: 180 },
  ]);
});

test("새 쪽 표시가 있으면 자리가 남아도 새 쪽에서 시작한다", () => {
  const blocks = [
    { top: 0, bottom: 20 },
    { top: 30, bottom: 50, breakBefore: true },
  ];
  assert.deepEqual(splitPages(blocks, 50, 100), [
    { top: 0, bottom: 30 },
    { top: 30, bottom: 50 },
  ]);
});

test("제목은 다음 묶음과 같은 쪽으로 간다", () => {
  const blocks = [
    { top: 0, bottom: 80 },
    { top: 85, bottom: 95, keepWithNext: true },
    { top: 100, bottom: 150 },
  ];
  assert.deepEqual(splitPages(blocks, 150, 100), [
    { top: 0, bottom: 85 },
    { top: 85, bottom: 150 },
  ]);
});

test("새 쪽 제목은 제목 위치에서 새 쪽이 시작된다", () => {
  const blocks = [
    { top: 0, bottom: 20 },
    { top: 30, bottom: 40, breakBefore: true, keepWithNext: true },
    { top: 45, bottom: 60 },
  ];
  assert.deepEqual(splitPages(blocks, 60, 100), [
    { top: 0, bottom: 30 },
    { top: 30, bottom: 60 },
  ]);
});

test("한 쪽보다 긴 묶음만 쪽 높이대로 자른다", () => {
  assert.deepEqual(splitPages([{ top: 0, bottom: 250 }], 250, 100), [
    { top: 0, bottom: 100 },
    { top: 100, bottom: 200 },
    { top: 200, bottom: 250 },
  ]);
});

test("파일 이름에서 쓸 수 없는 글자를 뺀다", () => {
  assert.equal(pdfFileName("우니스 시험 대비 경영/통계: 1?"), "우니스 시험 대비 경영 통계 1.pdf");
  assert.equal(pdfFileName(" / "), "우니스.pdf");
});
