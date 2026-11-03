"use client";

// 사용자가 확인·저장한 시간표를 이 기기 브라우저(localStorage)에만 보관한다. 서버로는 보내지 않는다.
// 한 학기 시간표 하나만 두므로, 다시 올려 저장하면 통째로 바꾼다.

import { useSyncExternalStore } from "react";
import { isClassSlot, sortSlots, type ClassSlot } from "./timetable";

const STORAGE_KEY = "unis.timetable.v1";
const EMPTY: ClassSlot[] = [];

let cache: ClassSlot[] | null = null;
const listeners = new Set<() => void>();

function read(): ClassSlot[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isClassSlot) : [];
  } catch {
    return [];
  }
}

function write(list: ClassSlot[]) {
  const sorted = sortSlots(list);
  if (sorted.length === 0) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  cache = sorted;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 다른 탭에서 바뀐 것도 반영한다.
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

export function useTimetable() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function saveTimetable(slots: ClassSlot[]) {
  write(slots);
}

export function clearTimetable() {
  write([]);
}
