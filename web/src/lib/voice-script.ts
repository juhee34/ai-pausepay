// 로고를 누르면 우니스가 소리 내어 읽는 문장과, 사용자가 말하거나 고른 것에 대한 대답.
// 화면 코드 없이 함수만 둔다. AI는 쓰지 않는다.
// 오늘의 한 가지(today-plan.ts)가 고른 순서를 그대로 말로 바꾼다. 문장 하나가 자막 한 줄이다.

export type VoiceTask = {
  course: string;
  title: string;
  hours: number; // 오늘 이 일에 쓰는 시간
  reason: string; // today-plan.ts의 이유 문장 (존댓말 한 문장)
  days: number; // 마감까지 남은 날
};

export type VoiceInput = {
  name: string | null; // 불러 줄 이름. 없으면 이름 없이 부른다.
  hour: number; // 지금 시각 0~23
  available: number; // 오늘 쓸 수 있는 시간
  picks: VoiceTask[];
  deferred: { course: string; title: string } | null;
  isExample: boolean;
  // 오늘 남은 다음 수업. 수업 중이면 minutes가 0.
  nextClass: { course: string; minutes: number } | null;
  canListen?: boolean; // 말로 물어볼 수 있는 브라우저인지 (마지막 문장이 달라진다)
};

export const MAX_NICKNAME = 10;

// 마지막 글자에 받침이 있는지. 한글이 아니면 받침 없는 것으로 본다. 숫자는 읽는 소리로 본다.
export function hasBatchim(word: string) {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return /[0-9]$/.test(last) ? "013678".includes(last) : false;
  return code % 28 !== 0;
}

// 받침에 따라 조사를 고른다. josa("퀴즈 3", "이에요", "예요") → "퀴즈 3이에요"
export function josa(word: string, withBatchim: string, without: string) {
  return `${word}${hasBatchim(word) ? withBatchim : without}`;
}

// 1.5 → "1시간 30분", 2 → "2시간", 0.5 → "30분"
export function speakHours(hours: number) {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}분`;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

// 0 → "오늘", 1 → "내일", 2 → "모레", 그 뒤는 "5일 뒤"
export function dayWord(days: number) {
  return days === 0 ? "오늘" : days === 1 ? "내일" : days === 2 ? "모레" : `${days}일 뒤`;
}

// 시간대별 인사. [시작 시각, 문장] — 시작 시각부터 다음 칸 전까지.
export const TIME_GREETINGS: [number, string][] = [
  [0, "늦은 시간까지 고생 많아요. 너무 무리하지는 마세요."],
  [5, "좋은 아침이에요. 오늘도 같이 해 봐요."],
  [9, "오전 수업 잘 듣고 계세요?"],
  [12, "점심은 챙겨 드셨어요?"],
  [14, "오후도 힘내 봐요."],
  [18, "저녁 시간이에요. 오늘 하루 수고 많았어요."],
  [21, "오늘 하루도 고생 많았어요. 마무리만 같이 해요."],
];

export function timeGreeting(hour: number) {
  let line = TIME_GREETINGS[0][1];
  for (const [start, text] of TIME_GREETINGS) if (hour >= start) line = text;
  return line;
}

function greeting(name: string | null, hour: number) {
  return `${name ? `네, ${name}님. 부르셨나요?` : "네, 부르셨나요?"} ${timeGreeting(hour)}`;
}

export function nextClassLine(nextClass: VoiceInput["nextClass"]) {
  if (!nextClass) return null;
  return nextClass.minutes === 0
    ? `지금은 ${nextClass.course} 수업 시간이에요. 수업 끝나고 볼 일을 말씀드릴게요.`
    : `다음 수업인 ${nextClass.course}까지 ${speakHours(nextClass.minutes / 60)} 남았어요.`;
}

const NO_TASK_LINES = ["오늘은 급한 마감이 없어요.", "강의계획서를 올려 주시면 할 일을 골라 드릴게요."];

export function voiceScript(input: VoiceInput): string[] {
  const lines = [greeting(input.name?.trim() || null, input.hour)];
  const classLine = nextClassLine(input.nextClass);
  if (classLine) lines.push(classLine);

  const [main, ...more] = input.picks;
  if (!main) {
    lines.push(...NO_TASK_LINES);
  } else {
    if (input.isExample) lines.push("아직 일정이 없어서 예시로 말씀드릴게요.");
    lines.push(`오늘 ${speakHours(input.available)}이 있다면, ${main.course} ${main.title}부터 하세요.`);
    lines.push(main.reason);
    // 너무 길면 듣다 지치므로 다음 일은 두 개까지만 말한다.
    for (const [i, task] of more.slice(0, 2).entries()) {
      lines.push(`${i === 0 ? "그다음은" : "시간이 남으면"} ${josa(`${task.course} ${task.title}`, "이에요", "예요")}.`);
    }
    if (input.deferred) {
      lines.push(`${josa(`${input.deferred.course} ${input.deferred.title}`, "은", "는")} 내일로 미뤄도 괜찮아요.`);
    }
  }
  lines.push(input.canListen ? "더 필요한 게 있으면 말씀하시거나 아래에서 골라 주세요." : "더 필요한 게 있으면 아래에서 골라 주세요.");
  return lines;
}

// ── 말로 묻거나 아래 버튼으로 고르는 것 ──

export type VoiceIntent = "today" | "focus" | "class" | "deadline" | "exam" | "grades" | "career" | "mail" | "close";

// 아래 선택 버튼. 순서대로 보인다.
export const VOICE_CHOICES: { intent: VoiceIntent; label: string }[] = [
  { intent: "today", label: "오늘 뭐 하지?" },
  { intent: "focus", label: "집중 시작" },
  { intent: "class", label: "다음 수업" },
  { intent: "deadline", label: "다가오는 마감" },
  { intent: "exam", label: "시험 대비" },
  { intent: "grades", label: "기말 몇 점 필요해?" },
  { intent: "career", label: "취업 준비" },
  { intent: "mail", label: "교수님 메일" },
  { intent: "close", label: "괜찮아, 닫아 줘" },
];

// 앞에 있는 것부터 찾는다. 예: '시험 공부 시작'은 집중, '오늘 수업'은 수업.
const KEYWORDS: [VoiceIntent, string[]][] = [
  ["close", ["고마워", "고맙", "됐어", "닫아", "그만", "괜찮아", "끝내", "꺼 줘", "꺼줘"]],
  ["mail", ["메일", "교수님", "이메일"]],
  ["focus", ["집중", "타이머", "시작할", "시작하", "공부 시작"]],
  ["grades", ["학점", "몇 점", "몇점", "점수", "성적"]],
  ["exam", ["시험", "기말", "중간", "요약", "문제"]],
  ["class", ["수업", "강의", "시간표"]],
  ["deadline", ["마감", "일정", "이번 주", "이번주", "언제까지", "남은 과제"]],
  ["career", ["취업", "스펙", "대외활동", "자소서", "공고", "자격증", "역량"]],
  ["today", ["할 일", "할일", "뭐 해", "뭐해", "뭐 하지", "뭐하지", "뭐부터", "추천", "오늘"]],
];

// 음성 인식 결과(후보 여러 개)에서 가장 먼저 맞는 뜻을 찾는다. 못 찾으면 null.
export function matchIntent(texts: string | string[]): VoiceIntent | null {
  const list = (Array.isArray(texts) ? texts : [texts]).map((t) => t.replace(/\s+/g, " ").trim());
  for (const text of list) {
    if (!text) continue;
    for (const [intent, words] of KEYWORDS) if (words.some((w) => text.includes(w))) return intent;
  }
  return null;
}

export type VoiceContext = {
  main: VoiceTask | null;
  focusHref: string; // 가장 먼저 할 일로 여는 집중 모드 주소
  nextClass: VoiceInput["nextClass"];
  hasTimetable: boolean;
  // 일주일 안 마감, 가까운 순 (오늘의 한 가지 순위에 들어간 일 기준)
  weekTasks: { course: string; title: string; days: number }[];
  isExample: boolean;
};

export type VoiceReply = { lines: string[]; href?: string; close?: boolean };

export const NOT_UNDERSTOOD = "잘 못 알아들었어요. 다시 말씀하시거나 아래에서 골라 주세요.";

// 고른 것에 대한 대답과, 대답이 끝난 뒤 열 화면.
export function intentReply(intent: VoiceIntent, ctx: VoiceContext): VoiceReply {
  const example = ctx.isExample ? "예시 일정 기준이에요. " : "";
  switch (intent) {
    case "today":
      return ctx.main
        ? {
            lines: [`${example}${ctx.main.course} ${ctx.main.title}부터 하세요.`, ctx.main.reason, "오늘의 한 가지를 열게요."],
            href: "/today",
          }
        : { lines: NO_TASK_LINES, href: "/calendar" };
    case "focus":
      return ctx.main
        ? { lines: [`집중 모드를 켤게요. ${ctx.main.course} ${ctx.main.title}부터 시작해요.`], href: ctx.focusHref }
        : { lines: ["집중 모드를 켤게요. 과목을 골라 시작해 주세요."], href: "/focus" };
    case "class": {
      const line = nextClassLine(ctx.nextClass);
      if (line) return { lines: [line] };
      return ctx.hasTimetable
        ? { lines: ["오늘은 남은 수업이 없어요."] }
        : { lines: ["시간표가 아직 없어요. 시간표를 올리는 화면을 열게요."], href: "/timetable" };
    }
    case "deadline": {
      const [first] = ctx.weekTasks;
      if (!first) return { lines: ["일주일 안에 마감인 일은 없어요. 여유 있을 때 다음 주 일을 미리 해 둬요."] };
      return {
        lines: [
          `${example}일주일 안에 마감이 ${ctx.weekTasks.length}개 있어요.`,
          `가장 가까운 건 ${first.course} ${first.title}, ${first.days === 0 ? "오늘까지예요" : josa(dayWord(first.days), "이에요", "예요")}.`,
          "주별로 볼 수 있게 학기 리스크 지도를 열게요.",
        ],
        href: "/risk",
      };
    }
    case "exam":
      return { lines: ["시험 대비를 열게요. 강의자료를 올리면 요약과 문제를 만들어 드려요."], href: "/exam" };
    case "grades":
      return { lines: ["기말에 몇 점이 필요한지 같이 계산해 봐요."], href: "/grades" };
    case "career":
      return { lines: ["취업 준비 화면을 열게요. 대외활동과 스펙을 한곳에서 볼 수 있어요."], href: "/career" };
    case "mail":
      return { lines: ["교수님께 보낼 메일을 같이 써 볼게요."], href: "/mail" };
    case "close":
      return { lines: ["네, 언제든 다시 불러 주세요."], close: true };
  }
}
