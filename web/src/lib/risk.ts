// 학기 리스크 지도 계산. 화면 코드 없이 함수만 둔다. AI는 쓰지 않는다.
//
// 화면은 '그 주에 마감인 할 일이 몇 개 몰렸나'를 먼저 보여 주고, 공부 시간은 몰림을 판단하는 데 쓴다.
//   남은 공부 시간 = 예상 시간 − 집중 모드로 그 일정에 이미 쓴 시간
//   예상 시간 = 할 일에 직접 넣은 값 > 사용자가 정한 종류별 시간(unis.studyHours.v1) > 기본값(시험 8 · 과제 3 · 퀴즈·기타 1)
// 넘침(몰림) = 그 주에 해야 할 시간 > 그 주에 공부할 수 있는 시간 (사용자가 정한 값, 기본 14시간, 이번 주는 남은 날만큼)
//
// 확인용 예시 (오늘 2026-11-09 월요일 = 11주차, 16주차까지 6주, 일주일에 14시간)
// 1) 그대로 두면: 15주차 기말 3개 = 24시간 > 14시간 → 10시간 넘침
// 2) 넘치지 않게 나누면: 15주차에서 시험마다 30%(2.5시간)는 시험 주에 남기고, 넘친 10시간을 앞 주의 남는 시간으로 당긴다
//    → 바로 앞 14주차에 14시간이 비어 있어 10시간이 모두 들어간다. 15주차 14시간, 14주차 10시간(기말 미리), 넘침 없음
// 3) 시작일을 넣은 할 일은 시작 주부터 마감 주까지 고르게 나눈다 (팀 과제 12시간, 3주 → 4 · 4 · 4)
// 시간은 30분 단위로 계산한다 (정수 '반시간'으로 세서 소수 오차를 없앤다).

import { addDays, daysUntil } from "./briefing";
import type { DeadlineKind } from "./syllabus";

// 학기 날짜는 여기 한 곳에서만 바꾼다. 1주차 = 개강일(2026-09-01)이 속한 주의 월요일.
export const SEMESTER = { label: "2026년 2학기", week1Monday: "2026-08-31", lastWeek: 16 } as const;
export const SEMESTER_WEEK1_MONDAY = SEMESTER.week1Monday;
export const LAST_WEEK = SEMESTER.lastWeek;

export type RiskPlan = "now" | "spread";
export type RiskDeadline = {
  id?: string;
  title: string;
  course: string;
  date: string; // YYYY-MM-DD 마감일
  kind: DeadlineKind;
  done?: boolean;
  hours?: number; // 할 일에 직접 넣은 예상 시간
  startDate?: string; // 할 일에 넣은 시작일
  source?: "posting"; // 공고 일정
};

// 그 주에 할 일 한 줄. prep: 마감이 뒤 주인데 이 주에 미리 하는 몫
export type RiskWeekItem = {
  id?: string;
  course: string;
  title: string;
  kind: DeadlineKind;
  hours: number;
  prep: boolean;
  dueWeek: number;
};
export type RiskWeek = {
  week: number;
  start: string; // 그 주 월요일
  total: number; // 그 주에 해야 할 시간
  capacity: number; // 그 주에 공부할 수 있는 시간
  over: number; // 넘친 시간 (없으면 0)
  due: RiskDue[]; // 이 주가 마감인 할 일 (화면은 개수로 몰림을 보여 준다)
  items: RiskWeekItem[]; // 이 주에 하는 공부. 시간 많은 순
};
export type RiskDue = { id?: string; course: string; title: string; kind: DeadlineKind };
// cells: 주마다 해야 할 공부 시간, due: 주마다 마감인 할 일 개수
export type RiskRow = { course: string; cells: number[]; due: number[] };
export type RiskMap = {
  weeks: RiskWeek[];
  rows: RiskRow[];
  need: number; // 남은 공부 시간 합계
  shortage: number; // 넘친 시간 합계
  spent: number; // 집중 모드로 이미 한 시간 (남은 시간에서 뺀 만큼)
  excluded: { postings: number; afterSemester: number };
};

export const DEFAULT_WEEKLY_HOURS = 14; // 우선순위의 기본값(하루 2시간) × 7일
export const MIN_WEEKLY_HOURS = 1;
export const MAX_WEEKLY_HOURS = 80;
export const MIN_TASK_HOURS = 0.5;
export const MAX_TASK_HOURS = 100;
export const DEFAULT_KIND_HOURS: Record<DeadlineKind, number> = { 중간: 8, 기말: 8, 과제: 3, 퀴즈: 1, 기타: 1 };

// 사용자가 정한 공부 시간 기준 (unis.studyHours.v1). 안 정한 칸은 기본값을 쓴다. 시험은 중간·기말 공통.
export const STUDY_HOUR_FIELDS = ["exam", "assignment", "quiz", "other", "weekly"] as const;
export type StudyHourField = (typeof STUDY_HOUR_FIELDS)[number];
export type StudyHours = Partial<Record<StudyHourField, number>>;
export const STUDY_HOUR_LABELS: Record<StudyHourField, string> = {
  exam: "시험 공부",
  assignment: "과제",
  quiz: "퀴즈",
  other: "기타",
  weekly: "일주일에 공부할 수 있는 시간",
};
export function defaultStudyHour(field: StudyHourField) {
  if (field === "weekly") return DEFAULT_WEEKLY_HOURS;
  return { exam: DEFAULT_KIND_HOURS.기말, assignment: DEFAULT_KIND_HOURS.과제, quiz: DEFAULT_KIND_HOURS.퀴즈, other: DEFAULT_KIND_HOURS.기타 }[field];
}
// 30분 단위, 칸마다 정한 범위 안
export function isStudyHourValue(field: StudyHourField, value: unknown): value is number {
  const [min, max] = field === "weekly" ? [MIN_WEEKLY_HOURS, MAX_WEEKLY_HOURS] : [MIN_TASK_HOURS, MAX_TASK_HOURS];
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max && Number.isInteger(value * 2);
}
export function isStudyHours(value: unknown): value is StudyHours {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.every(([key, v]) => (STUDY_HOUR_FIELDS as readonly string[]).includes(key) && isStudyHourValue(key as StudyHourField, v));
}
export function kindHoursOf(study: StudyHours = {}): Record<DeadlineKind, number> {
  const exam = study.exam ?? DEFAULT_KIND_HOURS.기말;
  return {
    중간: exam,
    기말: exam,
    과제: study.assignment ?? DEFAULT_KIND_HOURS.과제,
    퀴즈: study.quiz ?? DEFAULT_KIND_HOURS.퀴즈,
    기타: study.other ?? DEFAULT_KIND_HOURS.기타,
  };
}
const EXAM_KEEP_SHARE = 0.3; // 시험 공부의 30%는 시험 주에 남긴다 (마지막 복습)
const PULL_WEEKS = 4; // 앞으로 당길 때 최대 몇 주 앞까지

const toUnits = (hours: number) => Math.round(hours * 2);
const toHours = (units: number) => units / 2;
const isExam = (kind: DeadlineKind) => kind === "중간" || kind === "기말";

// 할 일에 직접 넣은 시간 > 사용자가 정한 종류별 시간 > 기본값
export function hoursOf(item: Pick<RiskDeadline, "kind" | "hours">, kindHours: Record<DeadlineKind, number> = DEFAULT_KIND_HOURS) {
  return item.hours ?? kindHours[item.kind];
}

export function weekNumberOf(ymd: string) {
  return Math.floor(daysUntil(SEMESTER.week1Monday, ymd) / 7) + 1;
}

export function weekStartOf(week: number) {
  return addDays(SEMESTER.week1Monday, (week - 1) * 7);
}

// 이번 주에 남은 날 수 (오늘 포함, 월요일이면 7, 일요일이면 1)
export function daysLeftInWeek(today: string) {
  return 7 - (daysUntil(SEMESTER.week1Monday, today) % 7);
}

// 집중 모드 기록을 일정별 분으로 모은다
export function spentMinutesByDeadline(records: { deadlineId?: string; minutes: number }[]) {
  const spent: Record<string, number> = {};
  for (const record of records) {
    if (record.deadlineId) spent[record.deadlineId] = (spent[record.deadlineId] ?? 0) + record.minutes;
  }
  return spent;
}

type Alloc = { item: number; week: number; units: number };
// startWeek: '그대로 두면'에서 나누기 시작하는 주 (시작일 없으면 마감 주)
// earliestWeek: 앞으로 당길 때 가장 이른 주 (시작일이 있으면 그 주, 없으면 이번 주)
type Work = { deadline: RiskDeadline; course: string; units: number; dueWeek: number; startWeek: number; earliestWeek: number };

// units를 n칸에 고르게 나눈다. 남는 반시간은 뒤 칸부터 준다.
function evenSplit(units: number, n: number) {
  const base = Math.floor(units / n);
  const extra = units - base * n;
  return Array.from({ length: n }, (_, i) => base + (i >= n - extra ? 1 : 0));
}

export function buildRiskMap(
  deadlines: RiskDeadline[],
  today: string,
  plan: RiskPlan,
  options: { studyHours?: StudyHours; spentMinutes?: Record<string, number> } = {},
): RiskMap {
  const study = options.studyHours ?? {};
  const kindHours = kindHoursOf(study);
  const weeklyUnits = toUnits(study.weekly ?? DEFAULT_WEEKLY_HOURS);
  const spentMinutes = options.spentMinutes ?? {};
  const firstWeek = Math.max(1, weekNumberOf(today));
  const weekNumbers: number[] = [];
  for (let week = firstWeek; week <= SEMESTER.lastWeek; week++) weekNumbers.push(week);
  const index = (week: number) => week - firstWeek;

  // 이번 주는 남은 날만큼만 공부할 수 있다
  const capacity = weekNumbers.map((_, i) =>
    i === 0 ? Math.round((weeklyUnits * daysLeftInWeek(today)) / 7) : weeklyUnits,
  );

  // 남은 공부만 고른다. 공고 일정은 과목 공부가 아니라 따로 센다.
  const excluded = { postings: 0, afterSemester: 0 };
  let spentUnits = 0;
  const works: Work[] = [];
  for (const deadline of deadlines) {
    if (deadline.done || deadline.date < today) continue;
    if (deadline.source === "posting") {
      excluded.postings += 1;
      continue;
    }
    const dueWeek = weekNumberOf(deadline.date);
    if (dueWeek > SEMESTER.lastWeek) {
      excluded.afterSemester += 1;
      continue;
    }
    const planned = toUnits(hoursOf(deadline, kindHours));
    const spent = Math.min(planned, toUnits((spentMinutes[deadline.id ?? ""] ?? 0) / 60));
    spentUnits += spent;
    if (planned - spent <= 0) continue;
    const hasStart = Boolean(deadline.startDate && deadline.startDate < deadline.date);
    const startWeek = hasStart ? Math.max(firstWeek, weekNumberOf(deadline.startDate!)) : dueWeek;
    works.push({
      deadline,
      course: deadline.course.trim() || "과목 없음",
      units: planned - spent,
      dueWeek,
      startWeek,
      earliestWeek: hasStart ? startWeek : firstWeek,
    });
  }

  // 그대로 두면: 시작일이 있으면 시작 주~마감 주에 고르게, 없으면 마감 주에 모두
  const allocs: Alloc[] = [];
  works.forEach((work, item) => {
    const n = work.dueWeek - work.startWeek + 1;
    evenSplit(work.units, n).forEach((units, i) => {
      if (units > 0) allocs.push({ item, week: work.startWeek + i, units });
    });
  });

  if (plan === "spread") pullForward(works, allocs, capacity, firstWeek);

  const totals = weekNumbers.map(() => 0);
  for (const a of allocs) totals[index(a.week)] += a.units;

  // 과목 줄: 마감 개수는 마감 주에, 공부 시간은 실제로 하는 주에
  const rowsByCourse = new Map<string, RiskRow>();
  const rowOf = (course: string) => {
    const row = rowsByCourse.get(course) ?? { course, cells: weekNumbers.map(() => 0), due: weekNumbers.map(() => 0) };
    rowsByCourse.set(course, row);
    return row;
  };
  for (const work of works) rowOf(work.course).due[index(work.dueWeek)] += 1;
  for (const a of allocs) rowOf(works[a.item].course).cells[index(a.week)] += toHours(a.units);

  const weeks: RiskWeek[] = weekNumbers.map((week, i) => {
    const merged = new Map<string, RiskWeekItem>();
    for (const a of allocs.filter((x) => x.week === week)) {
      const work = works[a.item];
      const prep = week !== work.dueWeek;
      const key = `${a.item}|${prep}`;
      const line = merged.get(key) ?? {
        id: work.deadline.id,
        course: work.course,
        title: work.deadline.title,
        kind: work.deadline.kind,
        hours: 0,
        prep,
        dueWeek: work.dueWeek,
      };
      line.hours += toHours(a.units);
      merged.set(key, line);
    }
    return {
      week,
      start: weekStartOf(week),
      total: toHours(totals[i]),
      capacity: toHours(capacity[i]),
      over: toHours(Math.max(0, totals[i] - capacity[i])),
      due: works
        .filter((w) => w.dueWeek === week)
        .map((w) => ({ id: w.deadline.id, course: w.course, title: w.deadline.title, kind: w.deadline.kind })),
      items: [...merged.values()].sort((a, b) => b.hours - a.hours),
    };
  });

  return {
    weeks,
    rows: [...rowsByCourse.values()],
    need: toHours(totals.reduce((sum, value) => sum + value, 0)),
    shortage: weeks.reduce((sum, week) => sum + week.over, 0),
    spent: toHours(spentUnits),
    excluded,
  };
}

// 넘치지 않게 나누면: 뒤 주부터 보면서, 넘친 만큼을 앞 주(최대 4주 앞, 시작일 이후)의 남는 시간으로 당긴다.
// 시험은 30%를 시험 주에 남기고, 퀴즈·기타는 당기지 않는다. 그래도 넘치면 그대로 둔다.
function pullForward(works: Work[], allocs: Alloc[], capacity: number[], firstWeek: number) {
  const totalOf = (week: number) => allocs.filter((a) => a.week === week).reduce((sum, a) => sum + a.units, 0);
  const lastWeek = firstWeek + capacity.length - 1;
  for (let week = lastWeek; week > firstWeek; week--) {
    let over = totalOf(week) - capacity[week - firstWeek];
    if (over <= 0) continue;
    const movable = allocs
      .filter((a) => a.week === week && a.units > 0)
      .filter((a) => {
        const kind = works[a.item].deadline.kind;
        return isExam(kind) || kind === "과제";
      })
      .sort((a, b) => Number(isExam(works[b.item].deadline.kind)) - Number(isExam(works[a.item].deadline.kind)) || b.units - a.units);
    for (const a of movable) {
      if (over <= 0) break;
      const work = works[a.item];
      const keep = isExam(work.deadline.kind) && week === work.dueWeek ? Math.ceil(work.units * EXAM_KEEP_SHARE) : 0;
      let canMove = Math.min(a.units - keep, over);
      const earliest = Math.max(work.earliestWeek, week - PULL_WEEKS);
      for (let target = week - 1; target >= earliest && canMove > 0; target--) {
        const room = capacity[target - firstWeek] - totalOf(target);
        if (room <= 0) continue;
        const moved = Math.min(room, canMove);
        const existing = allocs.find((x) => x.item === a.item && x.week === target);
        if (existing) existing.units += moved;
        else allocs.push({ item: a.item, week: target, units: moved });
        a.units -= moved;
        canMove -= moved;
        over -= moved;
      }
    }
  }
  for (let i = allocs.length - 1; i >= 0; i--) if (allocs[i].units <= 0) allocs.splice(i, 1);
}

// 넘친 주 가운데 가장 많이 넘친 주. 없으면 null.
export function worstWeek(map: RiskMap) {
  return map.weeks.filter((w) => w.over > 0).reduce<RiskWeek | null>((top, w) => (!top || w.over > top.over ? w : top), null);
}

// 마감인 할 일이 가장 많은 주. 같으면 시간이 많은 주, 그다음 빠른 주. 할 일이 없으면 null.
export function busiestWeek(map: RiskMap) {
  return map.weeks
    .filter((w) => w.due.length > 0)
    .reduce<RiskWeek | null>(
      (top, w) => (!top || w.due.length > top.due.length || (w.due.length === top.due.length && w.total > top.total) ? w : top),
      null,
    );
}

// '시험 3 · 과제 1'처럼 종류별 개수
export function kindSummary(due: RiskDue[]) {
  const order: DeadlineKind[] = ["중간", "기말", "과제", "퀴즈", "기타"];
  const label = (kind: DeadlineKind) => (kind === "중간" || kind === "기말" ? "시험" : kind);
  const counts = new Map<string, number>();
  for (const kind of order) for (const d of due) if (d.kind === kind) counts.set(label(kind), (counts.get(label(kind)) ?? 0) + 1);
  return [...counts].map(([name, n]) => `${name} ${n}`).join(" · ");
}

// 내 일정이 없을 때 보여 주는 예시. 오늘 기준으로 만들어서 시간이 지나도 비지 않는다. 저장하지 않는다.
// 기말은 학기 마지막 주 월~목에 두되, 그 주가 3주 안이면 오늘부터 3주 뒤로 둔다 (그래도 학기를 넘으면 빠진다).
export function exampleDeadlines(today: string): RiskDeadline[] {
  const at = (days: number) => addDays(today, days);
  const lastWeekMonday = weekStartOf(SEMESTER.lastWeek);
  const finalsStart = daysUntil(today, lastWeekMonday) >= 21 ? lastWeekMonday : at(21);
  const finals = (offset: number) => addDays(finalsStart, offset);
  return [
    { id: "ex-1", title: "과제 2", course: "회계원리", date: at(3), kind: "과제" },
    { id: "ex-2", title: "퀴즈 3", course: "조직행동론", date: at(4), kind: "퀴즈" },
    { id: "ex-3", title: "팀 프로젝트 발표", course: "마케팅원론", date: at(17), kind: "과제", hours: 12, startDate: at(3) },
    { id: "ex-4", title: "과제 3", course: "데이터과학입문", date: at(10), kind: "과제" },
    { id: "ex-5", title: "과제 2", course: "경영통계", date: at(11), kind: "과제" },
    { id: "ex-6", title: "기말고사", course: "마케팅원론", date: finals(0), kind: "기말" },
    { id: "ex-7", title: "기말고사", course: "조직행동론", date: finals(1), kind: "기말" },
    { id: "ex-8", title: "기말고사", course: "회계원리", date: finals(2), kind: "기말" },
    { id: "ex-9", title: "기말고사", course: "경영통계", date: finals(3), kind: "기말" },
    { id: "ex-10", title: "서류 마감", course: "○○ 인턴", date: at(6), kind: "기타", source: "posting" },
  ];
}
