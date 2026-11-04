import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server.js";

const root = fileURLToPath(new URL("../src", import.meta.url));
function fixture(failAt, failure = new Error("test-only failure")) {
  const imports = [];
  const cache = new Map();
  const fail = (stage) => { if (failAt === stage) throw failure; };
  const modules = {
    "firebase-admin/app": {
      getApps: () => { fail("get-apps"); return []; },
      cert: () => { fail("cert"); return {}; },
      initializeApp: () => ({ name: "unis-server" }),
    },
    "firebase-admin/auth": { getAuth: () => {
      fail("initialize-auth");
      return { verifyIdToken: async () => { throw new Error("test-only invalid token"); } };
    } },
    "firebase-admin/firestore": { getFirestore: () => { fail("initialize-firestore"); return {}; } },
  };
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = new Module(filename);
    mod.filename = filename;
    mod.paths = Module._nodeModulePaths(path.dirname(filename));
    const original = mod.require.bind(mod);
    mod.require = (name) => {
      if (name === "next/server") return { NextRequest, NextResponse };
      if (Object.hasOwn(modules, name)) {
        imports.push(name);
        fail(`load-${name.split("/").at(-1)}`);
        return modules[name];
      }
      const local = name.startsWith("@/") ? path.join(root, name.slice(2)) : name.startsWith(".") ? path.resolve(path.dirname(filename), name) : null;
      return local ? load(`${local}.ts`) : original(name);
    };
    cache.set(filename, mod);
    mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, filename);
    return mod.exports;
  }
  return { load, imports };
}

async function capture(work) {
  const names = ["FIREBASE_ADMIN_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY"];
  const previous = names.map((name) => process.env[name]);
  const values = ["test-project", "test-project", "test@example.invalid", "test-only-key-do-not-log"];
  const original = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  names.forEach((name, index) => { process.env[name] = values[index]; });
  try { await work(logs); }
  finally {
    console.error = original;
    names.forEach((name, index) => { if (previous[index] === undefined) delete process.env[name]; else process.env[name] = previous[index]; });
  }
}

test("토큰이 없으면 SDK를 불러오지 않고, 가짜 토큰은 기존 401 응답을 유지한다", async () => {
  await capture(async (logs) => {
    const f = fixture();
    const { GET } = f.load("app/api/usage/route.ts");
    const guest = await GET(new NextRequest("https://unis.test/api/usage"));
    assert.equal(guest.status, 401);
    assert.deepEqual(f.imports, []);
    const response = await GET(new NextRequest("https://unis.test/api/usage", { headers: { Authorization: "Bearer fake.token.value" } }));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "로그인 확인이 만료됐어요. 다시 로그인해 주세요." });
    assert.deepEqual(logs, []);
  });
});

test("auth 모듈 로드 실패는 401로 숨기지 않고 단계 로그와 기존 503을 유지한다", async () => {
  await capture(async (logs) => {
    const error = new Error("require() of ES Module /var/task/node_modules/jose/dist/webapi/index.js not supported\nrequest=private test text");
    const f = fixture("load-auth", error);
    const { GET } = f.load("app/api/usage/route.ts");
    const response = await GET(new NextRequest("https://unis.test/api/usage", { headers: { Authorization: "Bearer fake.token.value" } }));
    assert.equal(response.status, 503);
    assert.deepEqual(logs.map(([stage]) => stage), ["account:load-auth", "account:usage-route"]);
    assert.match(logs[0][2], /jose/);
    assert.equal(JSON.stringify(logs).includes("private test text"), false);
    assert.equal(JSON.stringify(logs).includes("fake.token.value"), false);
  });
});

test("app·초기화·firestore에서 어느 단계가 실패했는지 구분한다", async () => {
  for (const [failure, stage, method] of [
    ["load-app", "load-app", "getAdminApp"],
    ["get-apps", "get-admin-app", "getAdminApp"],
    ["cert", "initialize-app", "getAdminApp"],
    ["load-firestore", "load-firestore", "getAdminDb"],
    ["initialize-firestore", "initialize-firestore", "getAdminDb"],
    ["initialize-auth", "initialize-auth", "verifiedUid"],
  ]) {
    await capture(async (logs) => {
      const f = fixture(failure, new TypeError("Cannot read properties of undefined\nprivate request text"));
      const admin = f.load("lib/firebase-admin.ts");
      await assert.rejects(() => admin[method](new Request("https://unis.test", { headers: { Authorization: "Bearer fake.token.value" } })));
      assert.equal(logs[0][0], `account:${stage}`);
      assert.equal(logs[0][1], "TypeError");
      assert.equal(logs[0][2], "Cannot read properties of undefined");
      assert.equal(logs.length, 1);
    });
  }
});

test("AI 공통 오류 경로도 같은 제한된 로그를 기록한다", async () => {
  await capture(async (logs) => {
    const f = fixture("load-auth", new Error("Cannot find module 'jose'\nrequest=private text"));
    const { checkAiLimit, withAiUsage } = f.load("lib/ai-route.ts");
    const handler = withAiUsage("timetable", async (request) => {
      const limit = await checkAiLimit(request);
      assert.ok(limit instanceof NextResponse);
      return limit;
    });
    const response = await handler(new NextRequest("https://unis.test/api/timetable", { headers: { Authorization: "Bearer fake.token.value" } }));
    assert.equal(response.status, 503);
    assert.deepEqual(logs.map(([stage]) => stage), ["account:load-auth", "account:ai-usage"]);
  });
});

test("예상한 AccountApiError는 바깥 오류 로그에 중복 기록하지 않는다", async () => {
  await capture(async (logs) => {
    delete process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    const f = fixture();
    const { GET } = f.load("app/api/usage/route.ts");
    const response = await GET(new NextRequest("https://unis.test/api/usage", { headers: { Authorization: "Bearer fake.token.value" } }));
    assert.equal(response.status, 503);
    assert.deepEqual(logs, []);
  });
});

test("로그는 단계·종류·200자 이내 첫 줄뿐이고 토큰·키·요청·스택·cause는 남기지 않는다", async () => {
  await capture(async (logs) => {
    const { logAccountError } = fixture().load("lib/account-diagnostics.ts");
    const secret = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    const errors = [
      new Error(`Cannot find module 'jose' Authorization: Bearer fake.token.value ${secret}\nrequest=private text`),
      new Error(`request body: private text ${secret}`),
      new Error("-----BEGIN PRIVATE KEY-----\nprivate-key-test\n-----END PRIVATE KEY-----"),
      new Error("Cannot access 'private request text' before initialization"),
      new Error("Cannot find module 'private-request-text'"),
      new Error(`Failed to load external module firebase-admin/auth: ERR_REQUIRE_ESM request=private text ${secret}`),
      new Error(`Cannot find module '/var/task/node_modules/jose/${"a/".repeat(250)}index.js'`),
    ];
    for (const error of errors) {
      error.stack = "private stack";
      error.cause = { request: "private request text" };
      logAccountError("load-auth", error);
    }
    logAccountError("load-auth", { message: "private request text", token: "fake.token.value" });
    const text = JSON.stringify(logs);
    assert.ok(logs.some(([, , message]) => message === "Failed to load external module firebase-admin: ERR_REQUIRE_ESM"));
    for (const value of [secret, "fake.token.value", "private text", "private request text", "private-request-text", "private stack", "private-key-test"]) assert.equal(text.includes(value), false);
    for (const [stage, name, message, ...extra] of logs) {
      assert.equal(stage, "account:load-auth");
      assert.equal(typeof name, "string");
      assert.equal(message.includes("\n"), false);
      assert.ok(message.length <= 200);
      assert.deepEqual(extra, []);
    }
  });
});
