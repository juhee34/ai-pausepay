import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// speech-voices.ts는 불러온 목록을 모듈 안에 기억하므로, 테스트마다 새로 불러온다.
const filename = fileURLToPath(new URL("../src/lib/speech-voices.ts", import.meta.url));
const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function freshModule() {
  const loaded = new Module(filename);
  loaded._compile(source, filename);
  return loaded.exports;
}

const KO = { name: "Google 한국의", lang: "ko-KR" };

// 크롬처럼 처음에는 빈 목록을 주는 가짜 speechSynthesis
function fakeSynth() {
  const listeners = new Set();
  return {
    voices: [],
    calls: 0,
    getVoices() {
      this.calls += 1;
      return this.voices;
    },
    addEventListener(type, fn) {
      if (type === "voiceschanged") listeners.add(fn);
    },
    removeEventListener(type, fn) {
      listeners.delete(fn);
    },
    fire() {
      listeners.forEach((fn) => fn());
    },
    get listening() {
      return listeners.size;
    },
  };
}

function useWindow(synth) {
  globalThis.window = { speechSynthesis: synth, setInterval, clearInterval, setTimeout, clearTimeout };
}

afterEach(() => {
  delete globalThis.window;
});

test("목록이 이미 있으면 바로 돌려준다", async () => {
  const synth = fakeSynth();
  synth.voices = [KO];
  useWindow(synth);
  const { loadVoices, currentVoices } = freshModule();
  assert.deepEqual(await loadVoices(), [KO]);
  assert.deepEqual(currentVoices(), [KO]);
});

test("처음엔 비어 있어도 voiceschanged 신호가 오면 그 목록으로 끝난다", async () => {
  const synth = fakeSynth();
  useWindow(synth);
  const { loadVoices, currentVoices } = freshModule();
  const pending = loadVoices({ maxTimeout: 2000, interval: 1000 });
  assert.deepEqual(currentVoices(), []);
  synth.voices = [KO];
  synth.fire();
  assert.deepEqual(await pending, [KO]);
  assert.equal(synth.listening, 0, "끝나면 신호 듣기를 그만둔다");
  assert.deepEqual(currentVoices(), [KO]);
});

test("신호가 없어도 interval마다 다시 읽어서 찾는다", async () => {
  const synth = fakeSynth();
  useWindow(synth);
  const { loadVoices } = freshModule();
  const pending = loadVoices({ maxTimeout: 2000, interval: 20 });
  setTimeout(() => (synth.voices = [KO]), 50);
  assert.deepEqual(await pending, [KO]);
});

test("maxTimeout이 지나면 빈 목록으로 끝나고, 다음에 다시 불러 본다", async () => {
  const synth = fakeSynth();
  useWindow(synth);
  const { loadVoices } = freshModule();
  assert.deepEqual(await loadVoices({ maxTimeout: 60, interval: 20 }), []);
  synth.voices = [KO];
  assert.deepEqual(await loadVoices({ maxTimeout: 60, interval: 20 }), [KO]);
});

test("여러 번 불러도 한 번만 불러온다", async () => {
  const synth = fakeSynth();
  useWindow(synth);
  const { loadVoices } = freshModule();
  const a = loadVoices({ maxTimeout: 2000, interval: 1000 });
  const b = loadVoices({ maxTimeout: 2000, interval: 1000 });
  assert.equal(a, b);
  synth.voices = [KO];
  synth.fire();
  await a;
});

test("음성 읽기가 없는 브라우저는 빈 목록", async () => {
  globalThis.window = {};
  const { loadVoices, currentVoices } = freshModule();
  assert.deepEqual(await loadVoices(), []);
  assert.deepEqual(currentVoices(), []);
});
