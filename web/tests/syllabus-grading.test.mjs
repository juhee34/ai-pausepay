// 실행: node --test tests/syllabus-grading.test.mjs
// 이미 설치된 TypeScript로 실제 저장소 코드를 메모리에서 읽는다. 결과 파일은 만들지 않는다.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import { NextRequest } from "next/server.js";
import ts from "typescript";

const sourceRoot = fileURLToPath(new URL("../src", import.meta.url));
const modules = new Map();
const stubs = new Map();
function loadSource(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const loaded = new Module(filename);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = (name) => {
    if (stubs.has(name)) return stubs.get(name);
    const local = name.startsWith("@/") ? path.join(sourceRoot, name.slice(2))
      : name.startsWith(".") ? path.resolve(path.dirname(filename), name) : null;
    return local ? loadSource(`${local}.ts`) : originalRequire(name);
  };
  modules.set(filename, loaded);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return loaded.exports;
}

const { reviewGrading } = loadSource(path.join(sourceRoot, "lib/syllabus.ts"));
const { GRADING_KEY, setCourseGrading, isGradingList } = loadSource(path.join(sourceRoot, "lib/grading-store.ts"));
const { parseBackup, importBackup, exportBackup, hasBackupData } = loadSource(path.join(sourceRoot, "lib/backup.ts"));

test("자료에 없는 비율은 채우지 않고, 100% 여부를 확인한다", () => {
  assert.deepEqual(reviewGrading([{ name: "기말", weight: "" }]), {
    items: [], total: 0, invalid: false, needsReview: true,
  });
  const complete = reviewGrading([
    { name: "중간", weight: "30" }, { name: "기말", weight: "40" },
    { name: "과제", weight: "20" }, { name: "출석", weight: "10" },
  ]);
  assert.equal(complete.total, 100);
  assert.equal(complete.needsReview, false);
  assert.equal(isGradingList(complete.items), true);
  assert.equal(reviewGrading([{ name: "기말", weight: "30" }]).needsReview, true);
});

test("syllabus 서버가 일정·비율을 함께 반환하고, 빈 비율·파일 오류·사용 제한을 처리한다", async (t) => {
  const oldSecret = process.env.AI_LIMIT_SECRET;
  process.env.AI_LIMIT_SECRET = "local-test-only-not-a-real-credential";
  let answer;
  let calls = 0;
  stubs.set("@/lib/claude", { getAnthropic: () => ({ messages: { parse: async (options) => {
    calls++;
    assert.equal(options.output_config.format.schema.properties.grading.type, "array");
    return { parsed_output: answer };
  } } }) });
  const { POST } = loadSource(path.join(sourceRoot, "app/api/syllabus/route.ts"));
  function request(file, cookie) {
    const form = new FormData();
    if (file) form.set("file", file);
    return new NextRequest("http://localhost/api/syllabus", {
      method: "POST", body: form, headers: cookie ? { cookie } : undefined,
    });
  }
  const file = () => new File(["synthetic test only"], "test.pdf", { type: "application/pdf" });
  try {
    await t.test("평가 비율만 있는 자료도 날짜를 만들지 않고 반환한다", async () => {
      answer = { course: " 통계 ", deadlines: [], grading: [{ name: "기말", weight: 40 }, { name: "중간", weight: 60 }] };
      const response = await POST(request(file()));
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.course, "통계");
      assert.deepEqual(result.deadlines, []);
      assert.equal(result.grading.length, 2);
      assert.match(response.headers.get("set-cookie"), /unis_ai_usage=/);
    });
    await t.test("비율이 없으면 빈 목록, 잘못된 날짜는 확인하도록 비운다", async () => {
      answer = { course: "통계", grading: [], deadlines: [{ course: "통계", title: "중간", kind: "중간", date: "2026-02-30", when: "8주차" }] };
      const response = await POST(request(file()));
      const result = await response.json();
      assert.deepEqual(result.grading, []);
      assert.equal(result.deadlines[0].date, null);
    });
    await t.test("같은 평가 항목은 한 줄로 합친다", async () => {
      answer = { course: "통계", deadlines: [], grading: [{ name: "과제", weight: 10 }, { name: "과제", weight: 15 }] };
      assert.deepEqual((await (await POST(request(file()))).json()).grading, [{ name: "과제", weight: 25 }]);
    });
    await t.test("파일 오류는 AI를 호출하기 전에 막는다", async () => {
      const before = calls;
      assert.equal((await POST(request())).status, 400);
      assert.equal((await POST(request(new File(["test"], "test.txt", { type: "text/plain" })))).status, 400);
      assert.equal((await POST(request(new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" })))).status, 413);
      assert.equal(calls, before);
    });
    await t.test("실패한 응답은 사용 횟수를 기록하지 않는다", async () => {
      answer = null;
      const response = await POST(request(file()));
      assert.equal(response.status, 502);
      assert.equal(response.headers.get("set-cookie"), null);
    });
    await t.test("하루 20회가 되면 AI를 호출하지 않는다", async () => {
      const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
      const payload = `${date}.20`;
      const signature = createHmac("sha256", process.env.AI_LIMIT_SECRET).update(payload).digest("base64url");
      const before = calls;
      assert.equal((await POST(request(file(), `unis_ai_usage=${payload}.${signature}`))).status, 429);
      assert.equal(calls, before);
    });
  } finally {
    if (oldSecret === undefined) delete process.env.AI_LIMIT_SECRET;
    else process.env.AI_LIMIT_SECRET = oldSecret;
    stubs.delete("@/lib/claude");
  }
});

test("소수 비율과 0%를 처리하고, 범위 밖 숫자는 저장 대상으로 삼지 않는다", () => {
  const decimal = reviewGrading([
    { name: "중간", weight: "33.3" }, { name: "기말", weight: "33.3" },
    { name: "과제", weight: "33.4" }, { name: "출석", weight: "0" },
  ]);
  assert.equal(decimal.total, 100);
  assert.equal(decimal.items.length, 3);
  assert.equal(decimal.needsReview, false);
  for (const weight of ["-1", "101", "NaN", "Infinity"]) {
    const result = reviewGrading([{ name: "기말", weight }]);
    assert.equal(result.invalid, true);
    assert.deepEqual(result.items, []);
  }
});

test("평가 비율이 없는 예전 백업을 계속 읽고, 잘못된 평가 비율은 거절한다", () => {
  const old = { app: "unis", version: 1, deadlines: [], activities: [] };
  assert.deepEqual(parseBackup(JSON.stringify(old)).grading, {});
  assert.equal(parseBackup(JSON.stringify({ ...old, grading: { 통계: [{ name: "기말", weight: "30" }] } })), null);
  assert.equal(parseBackup(JSON.stringify({ ...old, grading: [] })), null);
});

test("확인한 평가 비율을 백업·복원하며, 기기에 있던 다른 과목과 일정은 보존한다", async () => {
  const storage = new Map();
  global.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  const grading = [{ name: "기말", weight: 40 }, { name: "중간", weight: 60 }];
  setCourseGrading("통계", grading);
  assert.deepEqual(JSON.parse(storage.get(GRADING_KEY)).통계, grading);
  assert.equal(hasBackupData(), true);

  let exported;
  const originalCreate = URL.createObjectURL;
  const originalTimeout = global.setTimeout;
  URL.createObjectURL = (blob) => { exported = blob; return "blob:test"; };
  global.setTimeout = () => 0;
  global.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
  try { exportBackup(); } finally {
    URL.createObjectURL = originalCreate;
    global.setTimeout = originalTimeout;
  }
  const restored = parseBackup(await exported.text());
  assert.deepEqual(restored.grading.통계, grading);

  storage.clear();
  storage.set(GRADING_KEY, JSON.stringify({ 회계: [{ name: "기말", weight: 50 }] }));
  const result = importBackup(restored);
  assert.equal(result.addedGrading, 1);
  assert.deepEqual(JSON.parse(storage.get(GRADING_KEY)), {
    회계: [{ name: "기말", weight: 50 }], 통계: grading,
  });
  assert.equal(importBackup(restored).addedGrading, 0);
  assert.equal(importBackup(restored).changed, false);
});
