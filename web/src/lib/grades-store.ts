"use client";

// 과목별 목표 총점과 받은 점수를 이 기기 브라우저(localStorage)에만 보관한다.
// 기말 필요 점수 화면이 쓰고, 오늘의 한 가지가 목표 점수를 읽는다.

import { useSyncExternalStore } from "react";
import { DEFAULT_TARGET, GRADE_LEVELS, type GradeEstimate, type GradeLevel, type GradeScores } from "./grades";

// averages·grade·estimate·spreads는 나중에 더한 칸이라 옛 기록에는 없다. target은 오늘의 한 가지가 읽는다.
// mode는 절대평가를 없애서 쓰지 않는다. 옛 기록을 잃지 않게 읽기만 한다.
// spreads는 점수표에서 구한 항목별 표준편차(배점 기준)다. 전체 점수 목록은 저장하지 않는다.
export type CourseGrades = {
  target: number;
  scores: GradeScores;
  averages?: GradeScores;
  spreads?: GradeScores;
  mode?: "relative" | "absolute";
  grade?: GradeLevel;
  estimate?: GradeEstimate;
};
export type GradesData = Record<string, CourseGrades>;

export const GRADES_KEY = "unis.grades.v1";
const EMPTY: GradesData = {};

let cache: GradesData | null = null;
const listeners = new Set<() => void>();

function isScoreMap(value: unknown) {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0)
  );
}

function isEstimate(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const e = value as { spread?: unknown; shares?: Record<string, unknown> };
  // 비율이 0·100이거나 빠지면 컷을 계산할 수 없다.
  return (
    typeof e.spread === "number" &&
    Number.isFinite(e.spread) &&
    e.spread > 0 &&
    !!e.shares &&
    GRADE_LEVELS.every((grade) => {
      const share = e.shares?.[grade];
      return typeof share === "number" && share > 0 && share < 100;
    })
  );
}

export function isCourseGrades(value: unknown): value is CourseGrades {
  if (!value || typeof value !== "object") return false;
  const g = value as Record<string, unknown>;
  return (
    typeof g.target === "number" &&
    g.target >= 0 &&
    g.target <= 100 &&
    isScoreMap(g.scores) &&
    (g.averages === undefined || isScoreMap(g.averages)) &&
    (g.spreads === undefined || isScoreMap(g.spreads)) &&
    (g.mode === undefined || g.mode === "relative" || g.mode === "absolute") &&
    (g.grade === undefined || (GRADE_LEVELS as readonly unknown[]).includes(g.grade)) &&
    (g.estimate === undefined || isEstimate(g.estimate))
  );
}

function read(): GradesData {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(GRADES_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => isCourseGrades(value)),
    ) as GradesData;
  } catch {
    return {};
  }
}

function write(data: GradesData) {
  localStorage.setItem(GRADES_KEY, JSON.stringify(data));
  cache = data;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 다른 탭에서 바뀐 것도 반영한다.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== GRADES_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  if (cache === null) cache = read();
  return cache;
}

export function useGrades() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

function courseOf(data: GradesData, course: string): CourseGrades {
  return Object.hasOwn(data, course) ? data[course] : { target: DEFAULT_TARGET, scores: {} };
}

export function addGradesCourse(course: string) {
  const data = getSnapshot();
  write({ ...data, [course]: courseOf(data, course) });
}

export function setGradesTarget(course: string, target: number) {
  const data = getSnapshot();
  write({ ...data, [course]: { ...courseOf(data, course), target } });
}

// score가 null이면 그 항목의 점수를 지운다.
export function setGradesScore(course: string, item: string, score: number | null) {
  const data = getSnapshot();
  const current = courseOf(data, course);
  const scores = { ...current.scores };
  if (score === null) delete scores[item];
  else scores[item] = score;
  write({ ...data, [course]: { ...current, scores } });
}

// average가 null이면 그 항목의 평균을 지운다.
export function setGradesAverage(course: string, item: string, average: number | null) {
  const data = getSnapshot();
  const current = courseOf(data, course);
  const averages = { ...current.averages };
  if (average === null) delete averages[item];
  else averages[item] = average;
  write({ ...data, [course]: { ...current, averages } });
}

// spread가 null이면 그 항목의 표준편차를 지운다.
export function setGradesSpread(course: string, item: string, spread: number | null) {
  const data = getSnapshot();
  const current = courseOf(data, course);
  const spreads = { ...current.spreads };
  if (spread === null) delete spreads[item];
  else spreads[item] = spread;
  write({ ...data, [course]: { ...current, spreads } });
}

export function setGradesSettings(
  course: string,
  settings: Partial<Pick<CourseGrades, "grade" | "estimate" | "target" | "spreads">>,
) {
  const data = getSnapshot();
  write({ ...data, [course]: { ...courseOf(data, course), ...settings } });
}

export function removeGradesCourse(course: string) {
  const data = { ...getSnapshot() };
  delete data[course];
  write(data);
}
