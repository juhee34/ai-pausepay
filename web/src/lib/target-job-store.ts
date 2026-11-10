"use client";

// 역량 공백 지도의 목표 직무. 파일·계정 백업에도 포함한다.
// - unis.targetJob.v1: 지금 보고 있는 직무 하나 (옛 기록 그대로)
// - unis.targetJobPicks.v1: ＋로 추가한 직무와 X로 지운 직무
// 못 읽거나 표에 없는 직무는 무시한다.

import { useSyncExternalStore } from "react";
import { JOB_COMPETENCIES } from "./competencies";

export type TargetJob = keyof typeof JOB_COMPETENCIES;
export const TARGET_JOBS = Object.keys(JOB_COMPETENCIES) as TargetJob[];

export const TARGET_JOB_KEY = "unis.targetJob.v1";
export const JOB_PICKS_KEY = "unis.targetJobPicks.v1";

export type JobPicks = { added: TargetJob[]; removed: TargetJob[] };
const EMPTY_PICKS: JobPicks = { added: [], removed: [] };

const listeners = new Set<() => void>();
let currentJob: TargetJob | null | undefined;
let currentPicks: JobPicks | undefined;

function isTargetJob(value: unknown): value is TargetJob {
  return (TARGET_JOBS as readonly unknown[]).includes(value);
}

export function isJobPicks(value: unknown): value is JobPicks {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    Object.keys(v).every((key) => key === "added" || key === "removed") &&
    Array.isArray(v.added) &&
    v.added.every(isTargetJob) &&
    Array.isArray(v.removed) &&
    v.removed.every(isTargetJob)
  );
}

export function readTargetJob(): TargetJob | undefined {
  try {
    const saved = localStorage.getItem(TARGET_JOB_KEY);
    return TARGET_JOBS.find((job) => job === saved);
  } catch {
    return undefined;
  }
}

// 추가·삭제한 적이 없으면 undefined
export function readJobPicks(): JobPicks | undefined {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(JOB_PICKS_KEY) ?? "null");
    return isJobPicks(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

function getJob() {
  if (currentJob === undefined) currentJob = readTargetJob() ?? null;
  return currentJob;
}

function getPicks() {
  if (currentPicks === undefined) currentPicks = readJobPicks() ?? EMPTY_PICKS;
  return currentPicks;
}

// 저장한 직무가 없으면 null. 어떤 직무를 보여 줄지는 화면이 칩 목록으로 정한다.
export function useSavedTargetJob() {
  return useSyncExternalStore(subscribe, getJob, () => null);
}

export function useJobPicks() {
  return useSyncExternalStore(subscribe, getPicks, () => EMPTY_PICKS);
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장하지 못해도 이번 화면에서는 고른 값으로 보여 준다.
  }
}

export function setTargetJob(job: TargetJob) {
  currentJob = job;
  save(TARGET_JOB_KEY, job);
  notify();
}

function setPicks(next: JobPicks) {
  currentPicks = next;
  save(JOB_PICKS_KEY, JSON.stringify(next));
  notify();
}

// ＋로 추가하면 그 직무를 바로 보여 준다.
export function addTargetJob(job: TargetJob) {
  const { added, removed } = getPicks();
  setPicks({ added: [...added.filter((j) => j !== job), job], removed: removed.filter((j) => j !== job) });
  setTargetJob(job);
}

// X로 지운 직무는 다시 추천돼도 나오지 않는다. ＋로만 다시 넣는다.
export function removeTargetJob(job: TargetJob) {
  const { added, removed } = getPicks();
  setPicks({ added: added.filter((j) => j !== job), removed: [...removed.filter((j) => j !== job), job] });
}
