// 실행: node --test tests/task-form.test.mjs
// 할 일 직접 넣기 창의 입력 검사를 확인한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const filename = fileURLToPath(new URL("../src/lib/task-form.ts", import.meta.url));
const loaded = new Module(filename);
loaded._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  filename,
);
const { parseTaskForm } = loaded.exports;

const base = { course: " 재무관리 ", title: " 과제 3 ", kind: "과제", startDate: "", date: "2026-11-20", hours: "", memo: "" };

test("필수 칸만 넣으면 저장하고, 비운 선택 칸은 값에 넣지 않는다", () => {
  const { fields, errors } = parseTaskForm(base);
  assert.deepEqual(errors, {});
  assert.deepEqual(fields, { course: "재무관리", title: "과제 3", kind: "과제", date: "2026-11-20" });
});

test("선택 칸을 넣으면 함께 저장한다", () => {
  const { fields } = parseTaskForm({ ...base, startDate: "2026-11-10", hours: " 2.5 ", memo: " 5쪽 보고서 " });
  assert.equal(fields.startDate, "2026-11-10");
  assert.equal(fields.hours, 2.5);
  assert.equal(fields.memo, "5쪽 보고서");
});

test("필수 칸이 비면 칸별로 안내한다", () => {
  const { fields, errors } = parseTaskForm({ ...base, course: " ", title: "", date: "" });
  assert.equal(fields, null);
  assert.deepEqual(Object.keys(errors).sort(), ["course", "date", "title"]);
});

test("시작일이 마감일보다 늦으면 막고, 같은 날은 된다", () => {
  assert.ok(parseTaskForm({ ...base, startDate: "2026-11-21" }).errors.startDate);
  assert.equal(parseTaskForm({ ...base, startDate: "2026-11-20" }).fields.startDate, "2026-11-20");
});

test("예상 시간은 0.5~100시간 숫자만 받는다", () => {
  for (const bad of ["0", "0.4", "101", "abc", "-1", "Infinity"]) {
    assert.ok(parseTaskForm({ ...base, hours: bad }).errors.hours, bad);
  }
  assert.equal(parseTaskForm({ ...base, hours: "0.5" }).fields.hours, 0.5);
  assert.equal(parseTaskForm({ ...base, hours: "100" }).fields.hours, 100);
});

test("글자 수 상한을 넘으면 막는다", () => {
  assert.ok(parseTaskForm({ ...base, title: "가".repeat(61) }).errors.title);
  assert.ok(parseTaskForm({ ...base, course: "가".repeat(31) }).errors.course);
  assert.ok(parseTaskForm({ ...base, memo: "가".repeat(301) }).errors.memo);
  assert.equal(parseTaskForm({ ...base, memo: "가".repeat(300) }).errors.memo, undefined);
});
