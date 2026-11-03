"use client";

// 사용자가 직접 적는 대외활동 일정. 캘린더 일정과 섞이지 않게 따로, 이 기기 브라우저에만 보관한다.
// 구조는 deadline-store.ts와 같다.

import { useSyncExternalStore } from "react";

export type Activity = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  done?: boolean; // 홈에서 체크한 일정
};

export const MAX_ACTIVITY_TITLE = 40;

const STORAGE_KEY = "unis.activities.v1";
const EMPTY: Activity[] = [];

let cache: Activity[] | null = null;
const listeners = new Set<() => void>();

function isActivity(value: unknown): value is Activity {
  if (!value || typeof value !== "object") return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.id === "string" &&
    typeof a.title === "string" &&
    typeof a.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(a.date)
  );
}

function read(): Activity[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isActivity) : [];
  } catch {
    return [];
  }
}

function write(list: Activity[]) {
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  cache = sorted;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
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

export function useActivities() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function addActivity(title: string, date: string) {
  write([
    ...getSnapshot(),
    { id: crypto.randomUUID(), title: title.trim().slice(0, MAX_ACTIVITY_TITLE), date },
  ]);
}

export function setActivityDone(id: string, done: boolean) {
  write(getSnapshot().map((a) => (a.id === id ? { ...a, done } : a)));
}

export function removeActivity(id: string) {
  write(getSnapshot().filter((a) => a.id !== id));
}
