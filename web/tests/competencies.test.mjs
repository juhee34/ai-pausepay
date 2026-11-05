// 실행: node --test tests/competencies.test.mjs
// 확정한 직무별 역량 표와 옛 이름 바꾸기를 검사한다 (docs/역량표/README.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../src", import.meta.url));
const cache = new Map();
function load(relative) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = (name) => (name.startsWith(".") ? load(path.resolve(path.dirname(filename), `${name}.ts`)) : original(name));
  cache.set(filename, mod);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return mod.exports;
}
const {
  ALL_COMPETENCIES, COMMON_COMPETENCIES, COMPETENCY_INFO, JOB_COMPETENCIES, LEGACY_COMPETENCY_NAMES,
  competencyGuide, normalizeCompetencies,
} = load("lib/competencies.ts");
const { buildGapMap } = load("lib/skill-gap.ts");

test("직무 이름 4개는 그대로이고, 직무마다 8칸 = 직무 역량 5개 + 공통 3개", () => {
  assert.deepEqual(Object.keys(JOB_COMPETENCIES), ["마케팅 기획", "데이터 분석", "서비스 기획", "재무·회계"]);
  for (const [job, list] of Object.entries(JOB_COMPETENCIES)) {
    assert.equal(new Set(list).size, 8, job);
    for (const common of COMMON_COMPETENCIES) assert.ok(list.includes(common), `${job}에 ${common}`);
  }
});

test("전체 역량은 22개이고 공통 3개가 먼저, 모두 뜻·예·근거가 있다", () => {
  assert.equal(ALL_COMPETENCIES.length, 22);
  assert.deepEqual(ALL_COMPETENCIES.slice(0, 3), ["문제 해결", "협업·리더십", "소통"]);
  for (const name of ALL_COMPETENCIES) {
    const info = COMPETENCY_INFO[name];
    assert.ok(info?.meaning && info.example && info.source, name);
  }
  assert.deepEqual(Object.keys(COMPETENCY_INFO).sort(), [...ALL_COMPETENCIES].sort());
  // AI에게 보내는 목록은 이름과 뜻을 한 줄씩
  const guide = competencyGuide().split("\n");
  assert.equal(guide.length, 22);
  assert.equal(guide[0], `- 문제 해결: ${COMPETENCY_INFO["문제 해결"].meaning}`);
});

test("옛 이름은 모두 새 표 안의 이름으로 바뀌고, 겹치면 하나로, 표에 없는 이름은 남긴다", () => {
  for (const [from, to] of Object.entries(LEGACY_COMPETENCY_NAMES)) {
    assert.ok(ALL_COMPETENCIES.includes(to), `${from} → ${to}`);
  }
  assert.deepEqual(normalizeCompetencies(["협업", "시장 분석"]), ["협업·리더십", "시장·소비자 분석"]);
  assert.deepEqual(normalizeCompetencies(["발표·설득", "커뮤니케이션"]), ["소통"]);
  assert.deepEqual(normalizeCompetencies(["사용자 조사", "외국어"]), ["사용자 조사", "외국어"]);
  assert.deepEqual(normalizeCompetencies(["협업·리더십"]), ["협업·리더십"]);
});

test("옛 이름으로 저장된 영수증도 공백 지도의 새 칸에 잡힌다", () => {
  const activities = [{ id: "a", title: "공모전", experience: true }];
  const oldReceipts = [
    { activityId: "a", competencies: ["협업", "시장 분석"] },
    { activityId: "a", competencies: ["협업", "시장 분석", "커뮤니케이션"] },
  ];
  const receipts = oldReceipts.map((r) => ({ ...r, competencies: normalizeCompetencies(r.competencies) }));
  const map = buildGapMap(JOB_COMPETENCIES["마케팅 기획"], activities, receipts, [{ activityId: "a", minutes: 60 }]);
  const cell = (name) => map.cells.find((c) => c.name === name);
  assert.equal(cell("협업·리더십").status, "채움");
  assert.equal(cell("시장·소비자 분석").status, "채움");
  assert.equal(cell("소통").status, "보강 필요");
});

test("공백 지도 예시 데이터(마케팅 기획)는 시안처럼 채움 4칸", () => {
  // web/src/app/career/skills/page.tsx의 EXAMPLE_RECEIPTS와 같은 값
  const receipts = [
    { activityId: "contest", competencies: ["시장·소비자 분석", "마케팅 전략 기획"] },
    { activityId: "contest", competencies: ["시장·소비자 분석", "마케팅 전략 기획", "협업·리더십"] },
    { activityId: "contest", competencies: ["소통"] },
    { activityId: "promo", competencies: ["콘텐츠 기획·제작", "소통"] },
    { activityId: "promo", competencies: ["협업·리더십", "소통"] },
    { activityId: "english", competencies: ["외국어"] },
  ];
  const activities = [
    { id: "contest", title: "교내 마케팅 공모전", experience: true },
    { id: "promo", title: "학생회 홍보팀", experience: true },
    { id: "english", title: "영어회화 스터디", experience: true },
  ];
  const map = buildGapMap(JOB_COMPETENCIES["마케팅 기획"], activities, receipts, []);
  assert.equal(map.counts["채움"], 4);
  // 예시 영수증의 이름이 모두 표 안에 있다 (외국어는 일부러 표 밖)
  for (const r of receipts) for (const name of r.competencies) assert.ok(name === "외국어" || ALL_COMPETENCIES.includes(name), name);
});
