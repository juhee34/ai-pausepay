import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import * as jose from "jose";

// firebase-admin.ts의 verifyFirebaseIdToken을 가짜 키로 시험한다. 진짜 Firebase 키·토큰은 쓰지 않는다.
const filename = fileURLToPath(new URL("../src/lib/firebase-admin.ts", import.meta.url));
const loaded = new Module(filename);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(filename);
const originalRequire = loaded.require.bind(loaded);
loaded.require = (name) => name === "./account-diagnostics" ? { logAccountError: () => {} } : originalRequire(name);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { verifyFirebaseIdToken } = loaded.exports;

const PROJECT = "test-project";
const { privateKey, publicKey } = await jose.generateKeyPair("RS256");
const otherKey = (await jose.generateKeyPair("RS256")).privateKey;
const jwk = { ...(await jose.exportJWK(publicKey)), kid: "test-key", alg: "RS256" };
const keys = jose.createLocalJWKSet({ keys: [jwk] });
const now = () => Math.floor(Date.now() / 1000);

// Firebase ID 토큰과 같은 모양. 바꿀 칸만 넘긴다.
async function token({ claims = {}, header = {}, key = privateKey, exp = now() + 3600 } = {}) {
  return new jose.SignJWT({ auth_time: now() - 60, ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "test-key", ...header })
    .setIssuer(claims.iss ?? `https://securetoken.google.com/${PROJECT}`)
    .setAudience(claims.aud ?? PROJECT)
    .setSubject(claims.sub ?? "user-123")
    .setIssuedAt(claims.iat ?? now() - 60)
    .setExpirationTime(exp)
    .sign(key);
}

test("맞는 토큰이면 uid를 돌려준다", async () => {
  assert.equal(await verifyFirebaseIdToken(await token(), PROJECT, jose, keys), "user-123");
});

test("다른 프로젝트, 다른 발급자, 만료, 다른 키로 서명한 토큰은 거절한다", async () => {
  const bad = {
    "다른 프로젝트(aud)": await token({ claims: { aud: "other-project" } }),
    "다른 발급자(iss)": await token({ claims: { iss: "https://securetoken.google.com/other-project" } }),
    "만료": await token({ exp: now() - 60 }),
    "다른 키로 서명": await token({ key: otherKey }),
    "가짜 문자열": "fake.token.value",
  };
  for (const [name, value] of Object.entries(bad)) {
    await assert.rejects(() => verifyFirebaseIdToken(value, PROJECT, jose, keys), undefined, name);
  }
});

test("uid가 비었거나 길거나 '/'가 있으면 거절한다", async () => {
  for (const sub of ["", "a".repeat(129), "users/other"]) {
    const value = await token({ claims: { sub } });
    await assert.rejects(() => verifyFirebaseIdToken(value, PROJECT, jose, keys), undefined, JSON.stringify(sub));
  }
});

test("발급·로그인 시각이 미래이거나 로그인 시각이 없으면 거절한다", async () => {
  const futureIat = await token({ claims: { iat: now() + 600 } });
  await assert.rejects(() => verifyFirebaseIdToken(futureIat, PROJECT, jose, keys));
  const futureAuth = await token({ claims: { auth_time: now() + 600 } });
  await assert.rejects(() => verifyFirebaseIdToken(futureAuth, PROJECT, jose, keys));
  const noAuthTime = await new jose.SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(`https://securetoken.google.com/${PROJECT}`)
    .setAudience(PROJECT)
    .setSubject("user-123")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
  await assert.rejects(() => verifyFirebaseIdToken(noAuthTime, PROJECT, jose, keys));
});

test("RS256이 아닌 서명(HS256)은 받지 않는다", async () => {
  const hs = await new jose.SignJWT({ auth_time: now() - 60 })
    .setProtectedHeader({ alg: "HS256", kid: "test-key" })
    .setIssuer(`https://securetoken.google.com/${PROJECT}`)
    .setAudience(PROJECT)
    .setSubject("user-123")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode("test-only-shared-secret-32-bytes!!"));
  await assert.rejects(() => verifyFirebaseIdToken(hs, PROJECT, jose, keys));
});
