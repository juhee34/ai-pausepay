import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const sourceRoot = fileURLToPath(new URL("../src", import.meta.url));
function loadSource(relative, stubs = new Map(), cache = new Map()) {
  const filename = path.resolve(sourceRoot, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = (name) => {
    if (stubs.has(name)) return stubs.get(name);
    return name.startsWith(".") ? loadSource(path.resolve(path.dirname(filename), `${name}.ts`), stubs, cache) : originalRequire(name);
  };
  cache.set(filename, loaded);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return loaded.exports;
}

test("Firebase 미설정·서버 렌더링에서는 초기화하지 않고 브라우저에서 한 번만 초기화한다", () => {
  const names = ["API_KEY", "AUTH_DOMAIN", "PROJECT_ID", "APP_ID"].map((name) => `NEXT_PUBLIC_FIREBASE_${name}`);
  const previous = names.map((name) => process.env[name]);
  const previousWindow = globalThis.window;
  const apps = [];
  const auth = {};
  let initializations = 0;
  const stubs = new Map([
    ["firebase/app", { getApps: () => apps, initializeApp: (config, name) => { initializations++; const app = { name, options: config }; apps.push(app); return app; } }],
    ["firebase/auth", { getAuth: () => auth }],
    ["firebase/firestore", { getFirestore: () => ({}) }],
  ]);
  try {
    names.forEach((name) => delete process.env[name]);
    globalThis.window = {};
    const missing = loadSource("lib/firebase.ts", stubs);
    assert.equal(missing.isFirebaseConfigured(), false);
    assert.equal(missing.getFirebaseAuth(), null);
    assert.equal(initializations, 0);
    names.forEach((name) => { process.env[name] = "demo-only"; });
    const configured = loadSource("lib/firebase.ts", stubs);
    delete globalThis.window;
    assert.equal(configured.getFirebaseAuth(), null);
    globalThis.window = {};
    assert.equal(configured.getFirebaseAuth(), auth);
    assert.equal(configured.getFirebaseAuth(), auth);
    assert.equal(initializations, 1);
    assert.equal(apps[0].name, "unis");
    assert.equal(auth.languageCode, "ko");
  } finally {
    names.forEach((name, i) => { if (previous[i] === undefined) delete process.env[name]; else process.env[name] = previous[i]; });
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

function createAccount(configured = true) {
  const auth = { currentUser: null };
  const calls = { popup: 0, observer: 0, unsubscribe: 0, signOut: 0 };
  let observer;
  let resolvePopup;
  let rejectPopup;
  let failSignOut = false;
  let usedProvider;
  const sdk = {
    GoogleAuthProvider: class {
      scopes = [];
      setCustomParameters(params) { this.params = params; }
      addScope(scope) { this.scopes.push(scope); }
    },
    onAuthStateChanged: (_auth, next) => { calls.observer++; observer = next; return () => { calls.unsubscribe++; }; },
    signInWithPopup: (_auth, provider) => {
      calls.popup++;
      usedProvider = provider;
      return new Promise((resolve, reject) => { resolvePopup = resolve; rejectPopup = reject; });
    },
    signOut: async () => {
      calls.signOut++;
      if (failSignOut) throw { code: "auth/network-request-failed" };
      auth.currentUser = null;
      observer?.(null);
    },
  };
  const account = loadSource("lib/firebase-auth.ts", new Map([
    ["./firebase", { getFirebaseAuth: () => configured ? auth : null, isFirebaseConfigured: () => configured }],
    ["firebase/auth", sdk],
  ]));
  return {
    account, calls, auth,
    provider: () => usedProvider,
    emit: (user) => { auth.currentUser = user; observer(user); },
    resolve: (user) => { auth.currentUser = user; resolvePopup({ user }); },
    reject: (error) => rejectPopup(error),
    failSignOut: () => { failSignOut = true; },
  };
}

test("로그인은 한 번만 실행하며 캘린더 권한 없이 Google 계정 상태를 공유한다", async () => {
  const { account, calls, provider, emit, resolve } = createAccount();
  const stopA = account.subscribeAccount(() => {});
  const stopB = account.subscribeAccount(() => {});
  assert.equal(calls.observer, 1);
  emit(null);
  assert.equal(account.getAccountSnapshot().status, "ready");
  const signingIn = account.signInWithGoogle();
  await account.signInWithGoogle();
  assert.equal(calls.popup, 1);
  assert.equal(account.getAccountSnapshot().busy, true);
  assert.deepEqual(provider().scopes, []);
  assert.deepEqual(provider().params, { prompt: "select_account" });
  const user = { uid: "alice", displayName: "테스트", email: "test@example.com", getIdToken: async () => "test-token" };
  emit(user);
  resolve(user);
  await signingIn;
  assert.equal(account.getAccountSnapshot().user, user);
  assert.equal(account.getAccountSnapshot().busy, false);
  assert.equal(await account.getFirebaseIdToken(), "test-token");
  stopA();
  assert.equal(calls.unsubscribe, 0);
  stopB();
  assert.equal(calls.unsubscribe, 1);
});

test("로그아웃은 기기 기록을 건드리지 않고, 다른 탭의 계정 변경도 반영한다", async () => {
  const { account, emit } = createAccount();
  const stop = account.subscribeAccount(() => {});
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = { clear() { assert.fail("기기 기록을 지우면 안 됨"); }, removeItem() { assert.fail("기기 기록을 지우면 안 됨"); } };
  try {
    emit({ uid: "alice" });
    await account.logOut();
    assert.equal(account.getAccountSnapshot().user, null);
    assert.equal(await account.getFirebaseIdToken(), null);
    emit({ uid: "bob" });
    assert.equal(account.getAccountSnapshot().user.uid, "bob");
    emit(null);
    assert.equal(account.getAccountSnapshot().user, null);
  } finally {
    stop();
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});

test("팝업 취소·로그아웃 실패를 안내하고 오류 내용에 들어 있는 정보를 노출하지 않는다", async () => {
  const { account, emit, reject, failSignOut } = createAccount();
  const stop = account.subscribeAccount(() => {});
  emit(null);
  const signingIn = account.signInWithGoogle();
  reject({ code: "auth/popup-closed-by-user" });
  await signingIn;
  assert.match(account.getAccountSnapshot().error, /취소/);
  assert.equal(account.getAccountSnapshot().busy, false);
  emit({ uid: "alice" });
  failSignOut();
  await account.logOut();
  assert.equal(account.getAccountSnapshot().user.uid, "alice");
  assert.match(account.getAccountSnapshot().error, /인터넷/);
  assert.doesNotMatch(account.accountErrorMessage({ message: "private-value" }), /private-value/);
  assert.match(account.accountErrorMessage({ code: "auth/popup-blocked" }), /팝업/);
  stop();
});

test("설정이 없어도 계정 화면은 준비 중 상태로 사용할 수 있다", async () => {
  const { account, calls } = createAccount(false);
  const stop = account.subscribeAccount(() => {});
  await account.signInWithGoogle();
  assert.equal(account.getAccountSnapshot().status, "unavailable");
  assert.equal(calls.popup, 0);
  stop();
});

test("계정별 백업·사용량 경로가 섞이지 않는다", () => {
  const paths = loadSource("lib/firebase-paths.ts");
  assert.deepEqual(paths.accountBackupPath("alice"), ["users", "alice", "backups", "current"]);
  assert.deepEqual(paths.accountUsagePath("bob", "2026-11-03"), ["users", "bob", "usage", "2026-11-03"]);
  assert.throws(() => paths.accountBackupPath("alice/backups/bob"));
  assert.throws(() => paths.accountUsagePath("alice", "../bob"));
});
