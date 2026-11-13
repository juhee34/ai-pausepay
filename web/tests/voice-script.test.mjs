import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// voice-script.ts는 다른 모듈에 기대지 않는 순수 함수라 TypeScript만 바꿔서 불러온다.
const filename = fileURLToPath(new URL("../src/lib/voice-script.ts", import.meta.url));
const loaded = new Module(filename);
loaded._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  filename,
);
const { voiceScript, josa, speakHours, hasBatchim, timeGreeting, TIME_GREETINGS, matchIntent, intentReply, VOICE_CHOICES, dayWord } =
  loaded.exports;

const BASE = { name: null, hour: 14, available: 2, picks: [], deferred: null, isExample: false, nextClass: null };
const PICK = { course: "재무관리", title: "퀴즈 3", hours: 1, days: 1, reason: "마감이 가까워서 오늘 끝내 두면 이번 주가 편해요." };

test("이름이 있으면 이름을 부르고, 없으면 이름 없이 부른다", () => {
  assert.equal(voiceScript({ ...BASE, name: "다희" })[0], "네, 다희님. 부르셨나요? 오후도 힘내 봐요.");
  assert.equal(voiceScript({ ...BASE, name: "  " })[0], "네, 부르셨나요? 오후도 힘내 봐요.");
  assert.equal(voiceScript(BASE)[0], "네, 부르셨나요? 오후도 힘내 봐요.");
});

test("시간대마다 인사가 다르다 (0·5·9·12·14·18·21시 기준)", () => {
  assert.equal(timeGreeting(3), TIME_GREETINGS[0][1]);
  assert.match(timeGreeting(7), /좋은 아침/);
  assert.match(timeGreeting(10), /오전/);
  assert.match(timeGreeting(12), /점심/);
  assert.match(timeGreeting(15), /오후/);
  assert.match(timeGreeting(19), /저녁/);
  assert.match(timeGreeting(23), /마무리/);
  const all = Array.from({ length: 24 }, (_, h) => timeGreeting(h));
  assert.equal(new Set(all).size, TIME_GREETINGS.length);
});

test("할 일이 없으면 강의계획서를 올리라고 말한다", () => {
  const lines = voiceScript(BASE);
  assert.deepEqual(lines.slice(1), [
    "오늘은 급한 마감이 없어요.",
    "강의계획서를 올려 주시면 할 일을 골라 드릴게요.",
    "더 필요한 게 있으면 아래에서 골라 주세요.",
  ]);
});

test("가장 효율 좋은 일부터 말하고, 다음 일은 두 개까지만 말한다", () => {
  const more = ["과제 2", "실습 보고서", "기말 복습"].map((title) => ({ ...PICK, course: "경영통계", title }));
  const lines = voiceScript({ ...BASE, picks: [PICK, ...more], deferred: { course: "회계원리", title: "과제 3" } });
  assert.deepEqual(lines.slice(1), [
    "오늘 2시간이 있다면, 재무관리 퀴즈 3부터 하세요.",
    "마감이 가까워서 오늘 끝내 두면 이번 주가 편해요.",
    "그다음은 경영통계 과제 2예요.",
    "시간이 남으면 경영통계 실습 보고서예요.",
    "회계원리 과제 3은 내일로 미뤄도 괜찮아요.",
    "더 필요한 게 있으면 아래에서 골라 주세요.",
  ]);
});

test("예시 데이터면 예시라고 먼저 말한다", () => {
  const lines = voiceScript({ ...BASE, picks: [PICK], isExample: true });
  assert.equal(lines[1], "아직 일정이 없어서 예시로 말씀드릴게요.");
});

test("다음 수업까지 남은 시간과 수업 중임을 말한다", () => {
  assert.equal(
    voiceScript({ ...BASE, picks: [PICK], nextClass: { course: "경영과학", minutes: 100 } })[1],
    "다음 수업인 경영과학까지 1시간 40분 남았어요.",
  );
  assert.match(voiceScript({ ...BASE, picks: [PICK], nextClass: { course: "경영과학", minutes: 0 } })[1], /지금은 경영과학 수업 시간이에요/);
});

test("받침에 따라 조사를 고른다", () => {
  assert.equal(josa("퀴즈 3", "이에요", "예요"), "퀴즈 3이에요");
  assert.equal(josa("과제 2", "이에요", "예요"), "과제 2예요");
  assert.equal(josa("발표", "은", "는"), "발표는");
  assert.equal(josa("보고서 작성", "은", "는"), "보고서 작성은");
  assert.equal(hasBatchim("Report"), false);
});

test("시간을 말하기 좋게 바꾼다", () => {
  assert.equal(speakHours(2), "2시간");
  assert.equal(speakHours(1.5), "1시간 30분");
  assert.equal(speakHours(0.5), "30분");
});

test("말로 물어볼 수 있으면 마지막 문장이 말해 달라고 한다", () => {
  assert.equal(voiceScript({ ...BASE, canListen: true }).at(-1), "더 필요한 게 있으면 말씀하시거나 아래에서 골라 주세요.");
});

test("말한 문장에서 뜻을 찾는다", () => {
  const cases = {
    "오늘 뭐 해야 돼": "today",
    "뭐부터 하지": "today",
    "집중 모드 켜 줘": "focus",
    "시험 공부 시작할래": "focus",
    "오늘 수업 언제야": "class",
    "시간표 보여 줘": "class",
    "이번 주 마감 알려 줘": "deadline",
    "기말 몇 점 받아야 돼": "grades",
    "중간고사 요약해 줘": "exam",
    "자소서 쓸 스펙 정리": "career",
    "교수님께 메일 보내야 해": "mail",
    "고마워 됐어": "close",
  };
  for (const [text, intent] of Object.entries(cases)) assert.equal(matchIntent(text), intent, text);
  assert.equal(matchIntent("배고파"), null);
  assert.equal(matchIntent(["배고파", "오늘 뭐 하지"]), "today");
});

const CTX = {
  main: PICK,
  focusHref: "/focus?deadline=d1&course=재무관리&hours=1",
  nextClass: null,
  hasTimetable: false,
  weekTasks: [
    { course: "재무관리", title: "퀴즈 3", days: 2 },
    { course: "경영통계", title: "과제 2", days: 5 },
  ],
  isExample: false,
};

test("고른 것마다 대답과 열 화면이 있다", () => {
  for (const { intent } of VOICE_CHOICES) {
    const reply = intentReply(intent, CTX);
    assert.ok(reply.lines.length > 0, intent);
    assert.ok(reply.lines.every((l) => l.trim() !== ""), intent);
  }
  assert.equal(intentReply("focus", CTX).href, CTX.focusHref);
  assert.equal(intentReply("today", CTX).href, "/today");
  assert.equal(intentReply("exam", CTX).href, "/exam");
  assert.equal(intentReply("close", CTX).close, true);
  assert.deepEqual(intentReply("deadline", CTX).lines.slice(0, 2), [
    "일주일 안에 마감이 2개 있어요.",
    "가장 가까운 건 재무관리 퀴즈 3, 모레예요.",
  ]);
});

test("시간표가 없으면 시간표 화면을, 있으면 다음 수업을 말한다", () => {
  assert.equal(intentReply("class", CTX).href, "/timetable");
  assert.deepEqual(intentReply("class", { ...CTX, hasTimetable: true }).lines, ["오늘은 남은 수업이 없어요."]);
  assert.match(intentReply("class", { ...CTX, nextClass: { course: "경영과학", minutes: 30 } }).lines[0], /경영과학까지 30분/);
});

test("할 일이 없을 때도 대답한다", () => {
  const empty = { ...CTX, main: null, weekTasks: [] };
  assert.equal(intentReply("today", empty).href, "/calendar");
  assert.equal(intentReply("focus", empty).href, "/focus");
  assert.match(intentReply("deadline", empty).lines[0], /마감인 일은 없어요/);
});

test("날짜를 말로 바꾼다", () => {
  assert.deepEqual([0, 1, 2, 5].map(dayWord), ["오늘", "내일", "모레", "5일 뒤"]);
});
