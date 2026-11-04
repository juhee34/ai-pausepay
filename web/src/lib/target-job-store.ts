"use client";

// 역량 공백 지도에서 고른 목표 직무를 기억한다. 파일·계정 백업에도 포함한다.
// 못 읽거나 표에 없는 직무면 첫 직무로 돌아간다.

import { useSyncExternalStore } from "react";
import { JOB_COMPETENCIES } from "./competencies";

export type TargetJob = keyof typeof JOB_COMPETENCIES;
export const TARGET_JOBS = Object.keys(JOB_COMPETENCIES) as TargetJob[];

export const TARGET_JOB_KEY = "unis.targetJob.v1";
const listeners = new Set<() => void>();
let current: TargetJob | null = null;

export function readTargetJob(): TargetJob | undefined {
  try {
    const saved = localStorage.getItem(TARGET_JOB_KEY);
    return TARGET_JOBS.find((job) => job === saved);
  } catch {
    return undefined;
  }
}

function getSnapshot(): TargetJob {
  if (current) return current;
  current = readTargetJob() ?? TARGET_JOBS[0];
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
    localStorage.setItem(TARGET_JOB_KEY, job);
  } catch {
    // 저장하지 못해도 이번 화면에서는 고른 직무로 보여 준다.
  }
  listeners.forEach((listener) => listener());
}
