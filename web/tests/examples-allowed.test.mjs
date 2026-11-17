import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const filename = fileURLToPath(new URL("../src/lib/use-examples-allowed.ts", import.meta.url));
const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

test("첫 방문, 시간표 등록, 로그인·계정 전환에 따라 예시 표시가 바뀐다", () => {
  let account = { status: "loading", user: null };
  let timetable = [];
  const loaded = new Module(filename);
  loaded.require = (name) => {
    if (name === "./firebase-auth") return { useAccount: () => account };
    if (name === "./timetable-store") return { useTimetable: () => timetable };
    throw new Error(`Unexpected import: ${name}`);
  };
  loaded._compile(source, filename);
  const { useExamplesAllowed } = loaded.exports;
  assert.equal(useExamplesAllowed(), false, "로그인 확인 중에는 예시가 잠깐 나타나지 않는다");
  account = { status: "ready", user: null };
  assert.equal(useExamplesAllowed(), true, "아무 기록 없는 비로그인 첫 방문");
  timetable = [{ course: "내 과목" }];
  assert.equal(useExamplesAllowed(), false, "시간표만 등록해도 예시를 숨긴다");
  timetable = [];
  account = { status: "ready", user: { uid: "alice" } };
  assert.equal(useExamplesAllowed(), false, "로그인한 사용자는 기록이 비어도 예시를 숨긴다");
  account = { status: "ready", user: { uid: "bob" } };
  assert.equal(useExamplesAllowed(), false, "다른 계정으로 바꿔도 예시를 숨긴다");
  account = { status: "ready", user: null };
  timetable = [{ course: "내 과목" }];
  assert.equal(useExamplesAllowed(), false, "로그아웃 후에도 실제 시간표가 있으면 예시를 숨긴다");
});
