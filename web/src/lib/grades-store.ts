"use client";

// 과목별 목표 총점과 받은 점수를 이 기기 브라우저(localStorage)에만 보관한다.
// 기말 필요 점수 화면이 쓰고, 오늘의 한 가지가 목표 점수를 읽는다.

import { useSyncExternalStore } from "react";
import { DEFAULT_TARGET, type GradeScores } from "./grades";

export type CourseGrades = { target: number; scores: GradeScores };
export type GradesData = Record<string, CourseGrades>;

export const GRADES_KEY = "unis.grades.v1";
const EMPTY: GradesData = {};

let cache: GradesData | null = null;
const listeners = new Set<() => void>();

export function isCourseGrades(value: unknown): value is CourseGrades {
  if (!value || typeof value !== "object") return false;
  const g = value as Record<string, unknown>;
  return (
    typeof g.target === "number" &&
    g.target >= 0 &&
    g.target <= 100 &&
    !!g.scores &&
    typeof g.scores === "object" &&
    !Array.isArray(g.scores) &&
    Object.values(g.scores).every(
      (score) => typeof score === "number" && Number.isFinite(score) && score >= 0,
    )
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

export function removeGradesCourse(course: string) {
  const data = { ...getSnapshot() };
  delete data[course];
  write(data);
}
