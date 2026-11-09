// 학기 결산서의 '시간 흐름' 계산. 화면 코드 없이 함수만 둔다. AI는 쓰지 않는다.
//
// 확인용 예시 (시안 06과 같은 숫자)
// 1) 주차별 합계 187시간 중 시험 주(8·15주차)가 22 + 22 = 44시간 → 44 ÷ 187 = 24%
// 2) 과제 마감일 - 첫 집중 기록일 = 미룬 정도. 2일 전에 시작한 과제가 가장 많이 미룬 과제
// 3) 조언은 정해진 규칙으로만 만든다 (아래 adviceFor)

import { daysUntil, toYmd } from "./briefing";
import { LAST_WEEK, weekNumberOf } from "./risk";
import type { SemesterReport } from "./semester-report";

type FlowRecord = { minutes: number; finishedAt: number; deadlineId?: string };
type FlowDeadline = {
  id: string;
  course: string;
  title: string;
  date: string;
  kind: string;
  source?: string;
  startDate?: string;
};

export type ExamShare = { weeks: number[]; hours: number; percent: number };
export type Procrastination = {
  course: string;
  title: string;
  leadDays: number; // 마감 며칠 전에 처음 집중했나. 마감 뒤면 음수
  averageLead: number; // 기록이 있는 과제들의 평균
  noticeDays?: number; // 직접 넣은 시작일이 마감 며칠 전인가
};
export type Advice = { strong: string; rest: string };

export type SemesterFlow = {
  weekly: number[]; // 1~16주차 시간
  examWeeks: number[];
  examShare: ExamShare | null;
  busiest: { week: number; hours: number } | null;
  procrastination: Procrastination | null;
};

// 시험 공부가 이만큼 몰렸으면 미리 나누라고 조언한다.
const EXAM_SHARE_ADVICE_PERCENT = 20;
// 과제를 평균 이 날짜보다 늦게 시작했으면 일찍 시작하라고 조언한다.
const LATE_START_DAYS = 3;
const WEEK_COUNT_WORDS: Record<number, string> = { 1: "시험 주", 2: "두 주", 3: "세 주" };

// 시안 06의 예시. 저장하지 않는다.
export const EXAMPLE_FLOW: SemesterFlow = {
  weekly: [4, 6, 8, 9, 10, 12, 14, 22, 9, 8, 10, 11, 12, 14, 22, 16],
  examWeeks: [8, 15],
  examShare: { weeks: [8, 15], hours: 44, percent: 24 },
  busiest: { week: 8, hours: 22 },
  procrastination: { course: "마케팅원론", title: "중간 레포트", leadDays: 2, averageLead: 5, noticeDays: 21 },
};

export function weeklyHours(records: FlowRecord[]) {
  const weekly = Array.from({ length: LAST_WEEK }, () => 0);
  for (const record of records) {
    const week = weekNumberOf(toYmd(new Date(record.finishedAt)));
    if (week >= 1 && week <= LAST_WEEK) weekly[week - 1] += record.minutes / 60;
  }
  return weekly;
}

// 중간·기말이 있는 주. 공고 일정은 뺀다.
export function examWeeksOf(deadlines: FlowDeadline[]) {
  const weeks = deadlines
    .filter((d) => !d.source && (d.kind === "중간" || d.kind === "기말"))
    .map((d) => weekNumberOf(d.date))
    .filter((week) => week >= 1 && week <= LAST_WEEK);
  return [...new Set(weeks)].sort((a, b) => a - b);
}

export function examShareOf(weekly: number[], examWeeks: number[]): ExamShare | null {
  const total = weekly.reduce((sum, hours) => sum + hours, 0);
  if (total <= 0 || examWeeks.length === 0) return null;
  const hours = examWeeks.reduce((sum, week) => sum + weekly[week - 1], 0);
  return { weeks: examWeeks, hours, percent: Math.round((hours / total) * 100) };
}

// 가장 많이 공부한 주. 같으면 앞 주.
export function busiestWeekOf(weekly: number[]) {
  let best: { week: number; hours: number } | null = null;
  weekly.forEach((hours, index) => {
    if (hours > 0 && (!best || hours > best.hours)) best = { week: index + 1, hours };
  });
  return best;
}

// 일정에서 시작한 집중 기록으로, 과제를 마감 며칠 전에 처음 시작했는지 본다.
export function procrastinationOf(records: FlowRecord[], deadlines: FlowDeadline[]): Procrastination | null {
  const firstDay = new Map<string, string>();
  for (const record of records) {
    if (!record.deadlineId) continue;
    const day = toYmd(new Date(record.finishedAt));
    const known = firstDay.get(record.deadlineId);
    if (!known || day < known) firstDay.set(record.deadlineId, day);
  }

  const tasks = deadlines
    .filter((d) => !d.source && d.kind === "과제" && firstDay.has(d.id))
    .map((d) => ({ deadline: d, lead: daysUntil(firstDay.get(d.id) as string, d.date) }));
  if (tasks.length === 0) return null;

  // 가장 늦게 시작한 과제. 같으면 마감이 앞선 것.
  const worst = tasks.reduce((a, b) =>
    b.lead < a.lead || (b.lead === a.lead && b.deadline.date < a.deadline.date) ? b : a,
  );
  const averageLead = Math.round(tasks.reduce((sum, task) => sum + task.lead, 0) / tasks.length);
  const notice = worst.deadline.startDate ? daysUntil(worst.deadline.startDate, worst.deadline.date) : undefined;
  return {
    course: worst.deadline.course,
    title: worst.deadline.title,
    leadDays: worst.lead,
    averageLead,
    ...(notice !== undefined && notice > 0 ? { noticeDays: notice } : {}),
  };
}

export function buildSemesterFlow(records: FlowRecord[], deadlines: FlowDeadline[]): SemesterFlow {
  const weekly = weeklyHours(records);
  const examWeeks = examWeeksOf(deadlines);
  return {
    weekly,
    examWeeks,
    examShare: examShareOf(weekly, examWeeks),
    busiest: busiestWeekOf(weekly),
    procrastination: procrastinationOf(records, deadlines),
  };
}

// "마감 2일 전", "마감 당일", "마감 1일 뒤"
export function leadLabel(days: number) {
  if (days > 0) return `마감 ${days}일 전`;
  if (days === 0) return "마감 당일";
  return `마감 ${-days}일 뒤`;
}

function hoursText(hours: number) {
  return String(Math.round(hours * 10) / 10);
}

// 기록에서 나온 사실이 있을 때만 조언한다. 없으면 빈 목록.
export function adviceFor(report: SemesterReport, flow: SemesterFlow): Advice[] {
  const advice: Advice[] = [];

  const worst = report.courses.find((course) => course.badge === "worst");
  if (worst) {
    const mostHours = report.courses.every((course) => course.hours <= worst.hours);
    advice.push({
      strong: `${worst.course}는 과제와 시험 준비를 더 일찍 시작해 보세요.`,
      rest: mostHours
        ? `시간은 가장 많이 썼는데(${hoursText(worst.hours)}시간) 가성비는 가장 낮았어요.`
        : `가성비가 가장 낮았어요(가성비 ${worst.value}).`,
    });
  }

  const share = flow.examShare;
  if (share && share.percent >= EXAM_SHARE_ADVICE_PERCENT) {
    const where = WEEK_COUNT_WORDS[share.weeks.length] ?? `${share.weeks.length}주`;
    advice.push({
      strong: "시험 3주 전에 시험 대비 팩을 시작해 보세요.",
      rest: `${where}에 몰린 ${share.percent}%를 앞쪽 주차로 나눌 수 있어요.`,
    });
  }

  const late = flow.procrastination;
  if (late && late.averageLead < LATE_START_DAYS) {
    advice.push({
      strong: "과제는 마감 일주일 전에 첫 집중을 해 보세요.",
      rest: `이번 학기 과제는 평균 ${leadLabel(late.averageLead)}에 시작했어요.`,
    });
  }
  return advice;
}
