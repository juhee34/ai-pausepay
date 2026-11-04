// 오늘의 한 가지 계산 (PRD 2-1). 화면 코드 없이 함수만 둔다. AI는 쓰지 않는다.
//
// 효율 = 배점(%) × (목표 득점률 − 예상 득점률) ÷ 예상 소요시간, 마감 3일 안이면 ×1.3, 7일 안이면 ×1.15
//
// 확인용 예시 (EXAMPLE_TASKS, 목표 0.9 · 예상 0.6)
//   팀 과제 발표자료  15 × 0.3 ÷ 2 × 1.3  = 2.925
//   퀴즈 3            5 × 0.3 ÷ 1 × 1.15 = 1.725
//   기말 대비 복습    30 × 0.3 ÷ 8        = 1.125
//   과제 3            10 × 0.3 ÷ 3        = 1.0
//   실습 보고서        9 × 0.3 ÷ 3        = 0.9

import type { DeadlineKind } from "./syllabus";

export type PlanTask = {
  id: string;
  course: string;
  title: string;
  date: string; // YYYY-MM-DD
  kind: DeadlineKind;
  // 예시 데이터처럼 값을 정해 둘 때만 쓴다. 없으면 아래 규칙으로 계산한다.
  weight?: number;
  hours?: number; // 사용자가 넣은 예상 시간도 여기로 온다
  startDate?: string; // 이 날이 되기 전에는 순위에 넣지 않는다
};

export type PlanSources = {
  // 과목별 평가 비율 (unis.grading.v1)
  grading: Record<string, { name: string; weight: number }[]>;
  // 과목별 목표 총점 (unis.grades.v1의 target)
  targets: Record<string, number>;
  // 과목별 시험 대비 팩 최근 정답률 0~1 (unis.examResults.v1)
  accuracy: Record<string, number>;
  // 배점을 나눌 때 세는 같은 과목·같은 종류 일정 (끝낸 일정·지난 일정 포함)
  allTasks: { course: string; kind: DeadlineKind }[];
};

export type EfficiencyLevel = "높음" | "보통" | "낮음";

export type ScoredTask = PlanTask & {
  weight: number;
  hours: number;
  days: number;
  efficiency: number;
  level: EfficiencyLevel;
  reason: string;
};

export type TodayPlan = {
  picks: { task: ScoredTask; hours: number }[];
  used: number;
  deferred: ScoredTask | null;
};

// 평가 비율이 없을 때의 배점(%). 기타는 PRD에 없어 퀴즈와 같게 둔다.
export const DEFAULT_WEIGHT: Record<DeadlineKind, number> = { 중간: 30, 기말: 30, 과제: 10, 퀴즈: 5, 기타: 5 };
// 예상 소요시간. 학기 리스크 지도(risk.ts)와 같은 값.
export const DEFAULT_HOURS: Record<DeadlineKind, number> = { 중간: 8, 기말: 8, 과제: 3, 퀴즈: 1, 기타: 1 };
export const DEFAULT_TARGET_RATE = 0.9;
export const DEFAULT_EXPECTED_RATE = 0.6;
export const DEFAULT_AVAILABLE_HOURS = 2;
export const MIN_AVAILABLE_HOURS = 0.5;
export const MAX_AVAILABLE_HOURS = 24;

// 직접 넣은 시간을 읽는다. 소수 한 자리까지 쓰고, 쓸 수 없는 값이면 null.
export function parseAvailableHours(text: string) {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  const hours = Math.round(value * 10) / 10;
  return hours >= MIN_AVAILABLE_HOURS && hours <= MAX_AVAILABLE_HOURS ? hours : null;
}

function daysBetween(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

function weightOf(task: PlanTask, sources: PlanSources) {
  if (task.weight !== undefined) return task.weight;
  const item = sources.grading[task.course]?.find((g) => g.name === task.kind);
  const total = item ? item.weight : DEFAULT_WEIGHT[task.kind];
  const count = sources.allTasks.filter((t) => t.course === task.course && t.kind === task.kind).length;
  return total / Math.max(count, 1);
}

function reasonOf(days: number, weight: number, hours: number) {
  if (days === 0) return "오늘 마감이에요. 다른 일보다 먼저 끝내요.";
  if (days <= 3) return "마감이 가까워서 오늘 끝내 두면 이번 주가 편해요.";
  if (weight >= 20) return "배점이 커서 조금씩이라도 먼저 시작하면 학점에 크게 남아요.";
  if (hours <= 1) return "짧게 끝낼 수 있어서 시간 대비 효율이 좋아요.";
  return "남은 일 중에서 시간 대비 배점이 가장 커요.";
}

// 오늘 마감인 일이 맨 앞이고, 그다음은 효율 높은 순. 같으면 마감이 빠른 순.
// 오늘 놓치면 점수를 잃는 일이라 배점이 작아도 미루지 않는다. 지난 일과 아직 시작 전인 일은 뺀다.
export function scoreTasks(today: string, tasks: PlanTask[], sources: PlanSources): ScoredTask[] {
  const scored = tasks
    .filter((t) => t.date >= today && (!t.startDate || t.startDate <= today))
    .map((t) => {
      const weight = weightOf(t, sources);
      const hours = t.hours ?? DEFAULT_HOURS[t.kind];
      const days = daysBetween(today, t.date);
      const target = (sources.targets[t.course] ?? DEFAULT_TARGET_RATE * 100) / 100;
      const expected = sources.accuracy[t.course] ?? DEFAULT_EXPECTED_RATE;
      const gap = Math.max(target - expected, 0);
      const boost = days <= 3 ? 1.3 : days <= 7 ? 1.15 : 1;
      const efficiency = (weight * gap * boost) / hours;
      return { ...t, weight, hours, days, efficiency, level: "보통" as EfficiencyLevel, reason: reasonOf(days, weight, hours) };
    })
    .sort(
      (a, b) =>
        Number(b.days === 0) - Number(a.days === 0) || b.efficiency - a.efficiency || a.date.localeCompare(b.date),
    );

  // 맨 앞이 오늘 마감일 수 있어서 가장 큰 효율을 따로 찾는다.
  const top = Math.max(0, ...scored.map((t) => t.efficiency));
  for (const t of scored) {
    const ratio = top > 0 ? t.efficiency / top : 0;
    t.level = ratio >= 0.66 ? "높음" : ratio >= 0.34 ? "보통" : "낮음";
  }
  return scored;
}

// 쓸 수 있는 시간을 순위가 높은 일부터 예상 소요시간만큼 나눈다.
// 시간이 모자라면 그 일은 남은 시간만큼만 하고, 남는 시간 없이 다 쓴다.
// 예시 4시간 → 팀 과제 2시간, 퀴즈 1시간, 기말 복습 1시간 (8시간 중)
// '오늘 미루는 일'은 시간을 받지 못한 일 중 효율이 가장 높은 일.
export function planToday(scored: ScoredTask[], available: number): TodayPlan {
  const picks: TodayPlan["picks"] = [];
  let left = available;
  for (const task of scored) {
    if (left <= 0) break;
    const hours = Math.min(task.hours, left);
    picks.push({ task, hours });
    left -= hours;
  }
  const picked = new Set(picks.map((p) => p.task.id));
  return {
    picks,
    used: available - left,
    deferred: scored.find((t) => !picked.has(t.id)) ?? null,
  };
}

export type CourseGroup = {
  course: string;
  // 그 과목 안에서 효율 높은 순. rank는 1부터. 오늘 시간을 받지 못한 일은 hours가 없다.
  tasks: { task: ScoredTask; rank: number; hours?: number }[];
  hours: number; // 오늘 이 과목에 쓰는 시간
  nearestDays: number; // 가장 가까운 마감까지 남은 날
};

// 과목별로 묶는다. 순위는 과목 안에서만 매기고, 과목 순서는 앞선 일이 먼저 나온 순서다.
export function groupByCourse(scored: ScoredTask[], picks: TodayPlan["picks"]): CourseGroup[] {
  const hoursOf = new Map(picks.map((p) => [p.task.id, p.hours]));
  const groups = new Map<string, CourseGroup>();
  for (const task of scored) {
    const group = groups.get(task.course) ?? { course: task.course, tasks: [], hours: 0, nearestDays: task.days };
    const hours = hoursOf.get(task.id);
    group.tasks.push({ task, rank: group.tasks.length + 1, hours });
    group.hours += hours ?? 0;
    group.nearestDays = Math.min(group.nearestDays, task.days);
    groups.set(task.course, group);
  }
  return [...groups.values()];
}

export function formatHours(hours: number) {
  return Number.isInteger(hours) ? `${hours}시간` : `${hours.toFixed(1)}시간`;
}

// 내 일정이 없을 때 보여 주는 시안의 예시. 저장하지 않는다. 날짜는 오늘 기준으로 만든다.
export function exampleTasks(today: string): PlanTask[] {
  const at = (days: number) => {
    const [y, m, d] = today.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
  };
  return [
    { id: "ex-1", course: "마케팅원론", title: "팀 과제 발표자료", date: at(3), kind: "과제", weight: 15, hours: 2 },
    { id: "ex-2", course: "마케팅원론", title: "퀴즈 3", date: at(5), kind: "퀴즈", weight: 5, hours: 1 },
    { id: "ex-3", course: "경영통계", title: "기말 대비 · 퀴즈 복습", date: at(35), kind: "기말", weight: 30, hours: 8 },
    { id: "ex-4", course: "회계원리", title: "과제 3", date: at(9), kind: "과제", weight: 10, hours: 3 },
    { id: "ex-5", course: "데이터과학입문", title: "실습 보고서", date: at(12), kind: "과제", weight: 9, hours: 3 },
  ];
}
