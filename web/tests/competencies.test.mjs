// 실행: node --test tests/competencies.test.mjs
// 역량 목록·기록 구분·옛 이름 바꾸기를 검사한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const filename = fileURLToPath(new URL("../src/lib/competencies.ts", import.meta.url));
const loaded = new Module(filename);
loaded._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  filename,
);
const c = loaded.exports;

test("자소서 역량은 6개씩 5묶음, 겹치지 않는 30개다", () => {
  assert.equal(c.SKILL_GROUPS.length, 5);
  assert.ok(c.SKILL_GROUPS.every((g) => g.names.length === 6));
  assert.equal(new Set(c.SKILLS).size, 30);
});

test("추천 직무는 8칸이고 모든 역량에 뜻과 근거가 있다", () => {
  for (const names of Object.values(c.JOB_COMPETENCIES)) assert.equal(new Set(names).size, 8);
  for (const name of c.ALL_COMPETENCIES) {
    assert.ok(c.COMPETENCY_INFO[name]?.desc, name);
    assert.ok(c.COMPETENCY_INFO[name]?.source, name);
  }
  assert.equal(Object.keys(c.COMPETENCY_INFO).length, c.ALL_COMPETENCIES.length);
});

test("기록 구분 9개의 추천 역량은 자소서 역량 안에 있다", () => {
  assert.equal(c.SPEC_KINDS.length, 9);
  for (const kind of c.SPEC_KINDS) {
    assert.equal(kind.suggest.length, 3);
    for (const name of kind.suggest) assert.ok(c.SKILLS.includes(name), `${kind.id}: ${name}`);
  }
});

test("옛 이름은 새 이름으로 바뀌고, 협업·리더십은 둘로 나뉘며, 모르는 이름은 남는다", () => {
  assert.deepEqual(c.normalizeCompetencies(["협업·리더십", "협업", "발표·설득", "정확성", "외국어"]), [
    "협업",
    "리더십",
    "설득·발표",
    "꼼꼼함",
    "외국어",
  ]);
  for (const targets of Object.values(c.LEGACY_COMPETENCY_NAMES)) {
    for (const name of targets) assert.ok(c.ALL_COMPETENCIES.includes(name), name);
  }
});
