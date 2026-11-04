// 학기 리스크 지도 계산. 화면 코드 없이 함수만 둔다. AI는 쓰지 않는다.
//
// 확인용 예시 (오늘 2026-11-03 = 10주차, 16주차까지 7주)
// 칸의 값은 그 주에 필요한 예상 공부 시간이다.
// 1) 15주차에 시험 4개 → 8 × 4 = 32시간. 다른 주 합계가 24면 평균 (32 + 24) ÷ 7 = 8, 32는 1.5배 이상이라 몰림, 평균의 4배
// 2) 미리 나누면 시험 하나(8시간): 70%인 6시간을 앞 4주에 1, 1, 2, 2로 나누고 시험 주에 2시간을 남긴다
// 3) 이번 주에 있는 시험은 나눌 앞 주가 없어 그대로 둔다

import { addDays, daysUntil } from "./briefing";
import type { DeadlineKind } from "./syllabus";

export type RiskPlan = "now" | "spread";
export type RiskDeadline = {
  title: string;
  course: string;
  date: string; // YYYY-MM-DD
  kind: DeadlineKind;
  done?: boolean;
  hours?: number; // 할 일에 직접 넣은 예상 시간
};

// prep: 시험 공부를 미리 나눠서 이 주에 하는 몫
export type RiskWeekItem = { course: string; title: string; hours: number; prep: boolean };

export type RiskWeek = {
  week: number;
  start: string; // 그 주 월요일
  total: number;
  count: number; // 그 주가 마감인 일정 수
  crowded: boolean;
  ratio: number; // 평균의 몇 배인지
  items: RiskWeekItem[]; // 그 주에 할 일. 시간 많은 순
};
export type RiskRow = { course: string; cells: number[] };
export type RiskMap = { weeks: RiskWeek[]; rows: RiskRow[]; average: number };

// 1주차 = 개강일(2026-09-01)이 속한 주의 월요일부터
export const SEMESTER_WEEK1_MONDAY = "2026-08-31";
export const LAST_WEEK = 16;
const CROWDED_RATIO = 1.5;
const SPREAD_SHARE = 0.7;
const SPREAD_WEEKS = 4;

const HOURS: Record<DeadlineKind, number> = { 중간: 8, 기말: 8, 과제: 3, 퀴즈: 1, 기타: 1 };
const TOP_WEEKS = 3;

export function hoursOf(item: Pick<RiskDeadline, "kind" | "hours">) {
  return item.hours ?? HOURS[item.kind];
}

export function weekNumberOf(ymd: string) {
  return Math.floor(daysUntil(SEMESTER_WEEK1_MONDAY, ymd) / 7) + 1;
}

export function weekStartOf(week: number) {
  return addDays(SEMESTER_WEEK1_MONDAY, (week - 1) * 7);
}

// 시험 공부 시간의 70%를 앞 주들에 나눈다. 합이 원래 시간과 같도록 정수로 나누고, 남는 1은 시험에 가까운 주에 준다.
export function spreadHours(hours: number, examWeek: number, firstWeek: number) {
  const earliest = Math.max(firstWeek, examWeek - SPREAD_WEEKS);
  const count = examWeek - earliest;
  if (count <= 0) return [{ week: examWeek, value: hours }];

  const spread = Math.round(hours * SPREAD_SHARE);
  const base = Math.floor(spread / count);
  const extra = spread - base * count;
  const parts = Array.from({ length: count }, (_, i) => ({
    week: earliest + i,
    value: base + (i >= count - extra ? 1 : 0),
  }));
  return [...parts, { week: examWeek, value: hours - spread }].filter((part) => part.value > 0);
}

export function buildRiskMap(deadlines: RiskDeadline[], today: string, plan: RiskPlan): RiskMap {
  const firstWeek = Math.max(1, weekNumberOf(today));
  const weekNumbers: number[] = [];
  for (let week = firstWeek; week <= LAST_WEEK; week++) weekNumbers.push(week);

  // 지난 일정, 끝낸 일정, 16주차 뒤 일정은 남은 공부가 아니다.
  const items = deadlines.filter(
    (d) => !d.done && d.date >= today && weekNumberOf(d.date) <= LAST_WEEK,
  );

  const rowsByCourse = new Map<string, number[]>();
  const counts = weekNumbers.map(() => 0);
  const itemsByWeek: RiskWeekItem[][] = weekNumbers.map(() => []);
  for (const item of items) {
    const week = weekNumberOf(item.date);
    const course = item.course.trim() || "과목 없음";
    const cells = rowsByCourse.get(course) ?? weekNumbers.map(() => 0);
    rowsByCourse.set(course, cells);
    counts[week - firstWeek] += 1;

    const hours = hoursOf(item);
    const isExam = item.kind === "중간" || item.kind === "기말";
    const parts =
      plan === "spread" && isExam
        ? spreadHours(hours, week, firstWeek)
        : [{ week, value: hours }];
    for (const part of parts) {
      cells[part.week - firstWeek] += part.value;
      itemsByWeek[part.week - firstWeek].push({ course, title: item.title, hours: part.value, prep: part.week !== week });
    }
  }

  const rows = [...rowsByCourse].map(([course, cells]) => ({ course, cells }));
  const totals = weekNumbers.map((_, i) => rows.reduce((sum, row) => sum + row.cells[i], 0));
  const sum = totals.reduce((total, value) => total + value, 0);
  const average = weekNumbers.length > 0 ? sum / weekNumbers.length : 0;

  const weeks = weekNumbers.map((week, i) => ({
    week,
    start: weekStartOf(week),
    total: totals[i],
    count: counts[i],
    crowded: totals[i] > 0 && totals[i] >= average * CROWDED_RATIO,
    ratio: average > 0 ? totals[i] / average : 0,
    items: [...itemsByWeek[i]].sort((a, b) => b.hours - a.hours),
  }));
  return { weeks, rows, average };
}

// 공부 시간이 가장 많은 몰린 주. 없으면 null.
export function topCrowdedWeek(map: RiskMap) {
  return map.weeks
    .filter((w) => w.crowded)
    .reduce<RiskWeek | null>((top, w) => (!top || w.total > top.total ? w : top), null);
}

// 공부 시간이 많은 주 순서. 할 일이 없는 주는 뺀다.
export function topWeeks(map: RiskMap) {
  return map.weeks
    .filter((w) => w.total > 0)
    .sort((a, b) => b.total - a.total || a.week - b.week)
    .slice(0, TOP_WEEKS);
}
