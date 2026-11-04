"use client";

// 역량 공백 지도에서 고른 목표 직무를 기억한다. 화면 설정일 뿐이라 백업에 넣지 않는다.
// 못 읽거나 표에 없는 직무면 첫 직무로 돌아간다.

import { useSyncExternalStore } from "react";
import { JOB_COMPETENCIES } from "./competencies";

export type TargetJob = keyof typeof JOB_COMPETENCIES;
export const TARGET_JOBS = Object.keys(JOB_COMPETENCIES) as TargetJob[];

const STORAGE_KEY = "unis.targetJob.v1";
const listeners = new Set<() => void>();
let current: TargetJob | null = null;

function getSnapshot(): TargetJob {
  if (current) return current;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    current = TARGET_JOBS.find((job) => job === saved) ?? TARGET_JOBS[0];
  } catch {
    current = TARGET_JOBS[0];
  }
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTargetJob() {
  return useSyncExternalStore(subscribe, getSnapshot, () => TARGET_JOBS[0]);
}

export function setTargetJob(job: TargetJob) {
  current = job;
  try {
    localStorage.setItem(STORAGE_KEY, job);
  } catch {
    // 저장하지 못해도 이번 화면에서는 고른 직무로 보여 준다.
  }
  listeners.forEach((listener) => listener());
}
