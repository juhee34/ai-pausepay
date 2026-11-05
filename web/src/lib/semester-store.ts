"use client";

// 학기 결산서에 넣는 과목별 학점과 예상 성적. 이 기기에만 저장하고, 파일·계정 백업에 포함한다.

import { useSyncExternalStore } from "react";
import { LETTER_GRADES, type SemesterCourse, type SemesterData } from "./semester-report";

export const SEMESTER_KEY = "unis.semester.v1";
const EMPTY: SemesterData = {};

const listeners = new Set<() => void>();
let cache: SemesterData | null = null;

export function isSemesterCourse(value: unknown): value is SemesterCourse {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.credits === "number" &&
    Number.isFinite(c.credits) &&
    c.credits >= 0 &&
    (c.grade === undefined || (LETTER_GRADES as readonly unknown[]).includes(c.grade))
  );
}

function read(): SemesterData {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SEMESTER_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return EMPTY;
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => isSemesterCourse(value)));
  } catch {
    return EMPTY;
  }
}

function getSnapshot() {
  if (cache === null) cache = read();
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 다른 탭에서 바뀐 것도 반영한다.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== SEMESTER_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSemesterData() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function setSemesterCourse(course: string, value: SemesterCourse) {
  const next = { ...getSnapshot(), [course]: value };
  cache = next;
  try {
    localStorage.setItem(SEMESTER_KEY, JSON.stringify(next));
  } catch {
    // 저장하지 못해도 이번 화면에서는 고른 값으로 보여 준다.
  }
  listeners.forEach((listener) => listener());
}
