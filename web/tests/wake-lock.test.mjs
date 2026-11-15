import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// keepScreenAwake만 시험한다. React 훅(useWakeLock)은 화면에서 확인한다.
const filename = fileURLToPath(new URL("../src/lib/wake-lock.ts", import.meta.url));
const loaded = new Module(filename);
const original = loaded.require.bind(loaded);
loaded.require = (id) => (id === "react" ? { useEffect() {} } : original(id));
loaded._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  filename,
);
const { keepScreenAwake } = loaded.exports;

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeBrowser({ supported = true, reject = false } = {}) {
  const listeners = new Set();
  const state = { requests: 0, releases: 0, sentinels: [] };
  globalThis.document = {
    visibilityState: "visible",
    addEventListener: (type, fn) => type === "visibilitychange" && listeners.add(fn),
    removeEventListener: (type, fn) => listeners.delete(fn),
  };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: supported
      ? {
          wakeLock: {
            async request() {
              state.requests += 1;
              if (reject) throw new Error("NotAllowedError");
              const sentinel = {
                released: false,
                async release() {
                  this.released = true;
                  state.releases += 1;
                },
              };
              state.sentinels.push(sentinel);
              return sentinel;
            },
          },
        }
      : {},
  });
  return {
    state,
    setVisible(visible) {
      globalThis.document.visibilityState = visible ? "visible" : "hidden";
      listeners.forEach((fn) => fn());
    },
    get listening() {
      return listeners.size;
    },
  };
}

afterEach(() => {
  delete globalThis.document;
  delete globalThis.navigator;
});

test("켜면 화면 잠금을 걸고, 끄면 푼다", async () => {
  const browser = fakeBrowser();
  const stop = keepScreenAwake();
  await tick();
  assert.equal(browser.state.requests, 1);
  stop();
  await tick();
  assert.equal(browser.state.releases, 1);
  assert.equal(browser.listening, 0);
});

test("다른 앱에 다녀와서 잠금이 풀렸으면 돌아올 때 다시 건다", async () => {
  const browser = fakeBrowser();
  const stop = keepScreenAwake();
  await tick();
  browser.setVisible(false);
  browser.state.sentinels[0].released = true; // 브라우저가 스스로 푼다
  await tick();
  assert.equal(browser.state.requests, 1, "숨어 있는 동안에는 걸지 않는다");
  browser.setVisible(true);
  await tick();
  assert.equal(browser.state.requests, 2);
  // 아직 걸려 있으면 또 걸지 않는다.
  browser.setVisible(true);
  await tick();
  assert.equal(browser.state.requests, 2);
  stop();
});

test("지원하지 않거나 거절돼도 오류 없이 넘어간다", async () => {
  fakeBrowser({ supported: false });
  keepScreenAwake()();
  const browser = fakeBrowser({ reject: true });
  const stop = keepScreenAwake();
  await tick();
  assert.equal(browser.state.requests, 1);
  stop();
});

test("거는 중에 끄면 걸리자마자 푼다", async () => {
  const browser = fakeBrowser();
  const stop = keepScreenAwake();
  stop();
  await tick();
  assert.equal(browser.state.releases, 1);
});
