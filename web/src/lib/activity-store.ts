"use client";

// 사용자가 직접 적는 대외활동. 캘린더 일정과 섞이지 않게 따로, 이 기기 브라우저에만 보관한다.
// 구조는 deadline-store.ts와 같다. 홈 달력·일정은 date(다음 마감)만 읽는다.

import { useSyncExternalStore } from "react";

export const ACTIVITY_STAGES = ["active", "applied", "done", "rejected"] as const;
export type ActivityStage = (typeof ACTIVITY_STAGES)[number];
export const STAGE_LABEL: Record<ActivityStage, string> = {
  active: "진행 중",
  applied: "지원 중",
  done: "끝남",
  rejected: "불합격",
};

export const ACTIVITY_KINDS = ["대외활동", "공모전", "인턴", "자격증", "채용", "동아리"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

// 단계·기관 같은 칸은 나중에 더해서 모두 선택이다. 옛 카드에는 없다.
export type ActivityDetails = {
  stage?: ActivityStage;
  org?: string;
  kind?: ActivityKind;
  role?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
};

export type Activity = ActivityDetails & {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD, 다음 마감
  done?: boolean; // 홈에서 체크한 일정
};

export type ActivityFields = ActivityDetails & Pick<Activity, "title" | "date">;

export const MAX_ACTIVITY_TITLE = 40;
export const MAX_ACTIVITY_TEXT = 40;

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

function isYmdText(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// 선택 칸마다 없거나 올바른 값이어야 한다. 백업 파일 검사도 이 함수를 쓴다.
export function hasValidActivityDetails(a: Record<string, unknown>) {
  return (
    (a.stage === undefined || (ACTIVITY_STAGES as readonly unknown[]).includes(a.stage)) &&
    (a.kind === undefined || (ACTIVITY_KINDS as readonly unknown[]).includes(a.kind)) &&
    (a.org === undefined || typeof a.org === "string") &&
    (a.role === undefined || typeof a.role === "string") &&
    (a.startDate === undefined || isYmdText(a.startDate)) &&
    (a.endDate === undefined || isYmdText(a.endDate))
  );
}

// 선택 칸 하나가 이상해도 카드는 잃지 않는다. 기본 칸만 남긴다.
function keepCard(a: Activity): Activity {
  if (hasValidActivityDetails(a)) return a;
  return { id: a.id, title: a.title, date: a.date, ...(a.done ? { done: a.done } : {}) };
}

// 끝났거나 불합격한 활동의 마감은 홈 달력·일정·추천에 띄우지 않는다.
export function isHomeActivity(a: Activity) {
  const stage = stageOf(a);
  return stage !== "done" && stage !== "rejected";
}

// 단계가 없는 옛 카드는 '진행 중'으로 읽는다.
export function stageOf(a: Activity): ActivityStage {
  return a.stage ?? "active";
}

function read(): Activity[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isActivity).map(keepCard) : [];
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

export function addActivityCard(fields: ActivityFields) {
  write([...getSnapshot(), { ...fields, id: crypto.randomUUID() }]);
}

export function updateActivity(id: string, fields: ActivityFields) {
  write(getSnapshot().map((a) => (a.id === id ? { ...a, ...fields } : a)));
}

export function setActivityStage(id: string, stage: ActivityStage) {
  write(getSnapshot().map((a) => (a.id === id ? { ...a, stage } : a)));
}

export function setActivityDone(id: string, done: boolean) {
  write(getSnapshot().map((a) => (a.id === id ? { ...a, done } : a)));
}

export function removeActivity(id: string) {
  write(getSnapshot().filter((a) => a.id !== id));
}
