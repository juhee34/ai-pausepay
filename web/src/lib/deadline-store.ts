"use client";

// 사용자가 확인·저장한 일정을 이 기기 브라우저(localStorage)에만 보관한다. 서버로는 보내지 않는다.
// 캘린더 화면과 오늘의 브리핑(홈)이 같이 쓴다.

import { useSyncExternalStore } from "react";
import { DEADLINE_KINDS, type Deadline } from "./syllabus";

export type SavedDeadline = Omit<Deadline, "date"> & {
  id: string;
  date: string; // 저장할 때는 날짜가 꼭 있어야 한다 (YYYY-MM-DD)
  done?: boolean; // 홈에서 체크한 일정
  source?: "posting"; // 공고에서 넣은 일정. course에 기관 이름이 들어 있어 과목 목록에서 뺀다.
};

const STORAGE_KEY = "unis.deadlines.v1";
const EMPTY: SavedDeadline[] = [];

let cache: SavedDeadline[] | null = null;
const listeners = new Set<() => void>();

function isSavedDeadline(value: unknown): value is SavedDeadline {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.id === "string" &&
    typeof d.title === "string" &&
    typeof d.course === "string" &&
    typeof d.when === "string" &&
    typeof d.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(d.date) &&
    (DEADLINE_KINDS as readonly unknown[]).includes(d.kind)
  );
}

function read(): SavedDeadline[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isSavedDeadline) : [];
  } catch {
    return [];
  }
}

function write(list: SavedDeadline[]) {
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
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

export function useSavedDeadlines() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

// 같은 과목·제목·날짜는 두 번 저장하지 않는다.
// 새로 추가된 개수와, 넣으려던 일정에 해당하는 저장된 일정(이미 있던 것 포함, .ics용)을 돌려준다.
export function addDeadlines(items: Omit<SavedDeadline, "id">[]) {
  const keyOf = (d: Omit<SavedDeadline, "id">) => `${d.course}|${d.title}|${d.date}`;
  const current = getSnapshot();
  const seen = new Set(current.map(keyOf));
  const fresh = items.filter((d) => !seen.has(keyOf(d))).map((d) => ({ ...d, id: crypto.randomUUID() }));
  write([...current, ...fresh]);
  const wanted = new Set(items.map(keyOf));
  return { added: fresh.length, saved: getSnapshot().filter((d) => wanted.has(keyOf(d))) };
}

export function setDeadlineDone(id: string, done: boolean) {
  write(getSnapshot().map((d) => (d.id === id ? { ...d, done } : d)));
}

export function removeDeadline(id: string) {
  write(getSnapshot().filter((d) => d.id !== id));
}
