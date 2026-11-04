import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import { generateKeyPairSync } from "node:crypto";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// firebase-admin.ts는 패키지를 쓸 때만 불러오므로, 정리 함수는 패키지 없이 시험할 수 있다.
const filename = fileURLToPath(new URL("../src/lib/firebase-admin.ts", import.meta.url));
const loaded = new Module(filename);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(filename);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { cleanEnvValue, normalizePrivateKey } = loaded.exports;

// 시험할 때마다 새로 만드는 가짜 키. 진짜 키가 아니다.
const pem = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" });
const escaped = pem.replace(/\n/g, "\\n");

test("Vercel에 흔히 붙여 넣는 모양을 모두 같은 키로 읽는다", () => {
  const shapes = {
    "JSON 값 그대로 (\\n 글자)": escaped,
    "실제 줄바꿈": pem,
    "앞뒤 따옴표": `"${escaped}"`,
    "JSON 줄 통째로": `"private_key": "${escaped}",`,
    "끝 \\n 없음": escaped.replace(/\\n$/, ""),
    "윈도 줄바꿈": pem.replace(/\n/g, "\r\n"),
    "앞뒤 공백": `  ${escaped}  `,
  };
  for (const [name, raw] of Object.entries(shapes)) {
    assert.equal(normalizePrivateKey(raw), pem, name);
  }
});

test("키가 없거나 BEGIN~END가 없으면 고치지 않는다", () => {
  assert.equal(normalizePrivateKey(undefined), undefined);
  assert.equal(normalizePrivateKey("   "), undefined);
  assert.equal(normalizePrivateKey("not-a-key"), "not-a-key");
});

test("프로젝트 ID·이메일의 따옴표·공백·쉼표만 걷어 낸다", () => {
  assert.equal(cleanEnvValue(' "unis-2025", '), "unis-2025");
  assert.equal(cleanEnvValue("a@b.iam.gserviceaccount.com"), "a@b.iam.gserviceaccount.com");
  assert.equal(cleanEnvValue('""'), undefined);
  assert.equal(cleanEnvValue(undefined), undefined);
});
