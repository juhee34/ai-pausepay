"use client";

// 과목별 성적 평가 항목과 배점을 이 기기 브라우저(localStorage)에만 보관한다.
// 기말 필요 점수 화면에서 직접 넣을 수 있고, 오늘의 한 가지가 배점을 읽는다.

import { useSyncExternalStore } from "react";
import type { GradingItem } from "./grades";

export type GradingData = Record<string, GradingItem[]>;

export const GRADING_KEY = "unis.grading.v1";
const EMPTY: GradingData = {};

let cache: GradingData | null = null;
const listeners = new Set<() => void>();

export function isGradingList(value: unknown): value is GradingItem[] {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (!item || typeof item !== "object") return false;
      const i = item as Record<string, unknown>;
      return (
        typeof i.name === "string" &&
        i.name.length > 0 &&
        typeof i.weight === "number" &&
        Number.isFinite(i.weight) &&
        i.weight > 0
      );
    })
  );
}

function read(): GradingData {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(GRADING_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => isGradingList(value)),
    ) as GradingData;
  } catch {
    return {};
  }
}

function write(data: GradingData) {
  localStorage.setItem(GRADING_KEY, JSON.stringify(data));
  cache = data;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 다른 탭에서 바뀐 것도 반영한다.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== GRADING_KEY) return;
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

export function useGrading() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function setCourseGrading(course: string, items: GradingItem[]) {
  write({ ...getSnapshot(), [course]: items });
}

export function removeCourseGrading(course: string) {
  const data = { ...getSnapshot() };
  delete data[course];
  write(data);
}
