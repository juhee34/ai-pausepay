"use client";

// 학기 리스크 지도에서 사용자가 정한 공부 시간 기준(종류별 예상 시간, 일주일에 공부할 수 있는 시간)을 기억한다.
// 정한 칸만 저장하고, 안 정한 칸은 기본값을 쓴다 (lib/risk.ts). 파일·계정 백업에도 포함한다. 구조는 target-job-store.ts와 같다.

import { useSyncExternalStore } from "react";
import { isStudyHours, type StudyHours } from "./risk";

export const STUDY_HOURS_KEY = "unis.studyHours.v1";
const EMPTY: StudyHours = {};
const listeners = new Set<() => void>();
let current: StudyHours | null = null;

// 저장된 값이 없거나 이상하면 undefined (기본값을 쓴다)
export function readStudyHours(): StudyHours | undefined {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STUDY_HOURS_KEY) ?? "null");
    return isStudyHours(parsed) && Object.keys(parsed).length > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function getSnapshot(): StudyHours {
  if (current) return current;
  current = readStudyHours() ?? EMPTY;
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useStudyHours() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

// 빈 값이면 저장을 지워 기본값으로 돌아간다
export function setStudyHours(next: StudyHours) {
  if (!isStudyHours(next)) return;
  current = Object.keys(next).length > 0 ? next : EMPTY;
  try {
    if (current === EMPTY) localStorage.removeItem(STUDY_HOURS_KEY);
    else localStorage.setItem(STUDY_HOURS_KEY, JSON.stringify(current));
  } catch {
    // 저장 공간이 없어도 이번 화면에서는 바꾼 값으로 계산한다.
  }
  listeners.forEach((listener) => listener());
}
