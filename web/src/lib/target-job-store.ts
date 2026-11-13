"use client";

// 역량 공백 지도의 목표 직무. 파일·계정 백업에도 포함한다.
// - unis.targetJob.v1: 지금 보고 있는 직무 하나. 추천 직무 이름("마케팅 기획") 또는 직접 만든 직무("custom:<id>")
// - unis.targetJobPicks.v1: ＋로 추가한 추천 직무와 X로 뺀 추천 직무 (직접 만든 직무가 없을 때 쓴다)
// 못 읽거나 없는 직무는 무시한다.

import { useSyncExternalStore } from "react";
import { JOB_COMPETENCIES, JOB_SKILLS, PRESET_JOBS, type PresetJob } from "./competencies";
import { readCustomJobs, type CustomJob } from "./custom-job-store";

export type TargetJob = PresetJob | `custom:${string}`;
// 옛 코드와 백업 검사가 쓰는 이름. 추천 직무만 들어 있다.
export const TARGET_JOBS = PRESET_JOBS;

export const TARGET_JOB_KEY = "unis.targetJob.v1";
export const JOB_PICKS_KEY = "unis.targetJobPicks.v1";
const CUSTOM_PREFIX = "custom:";

// 추가·삭제는 추천 직무만 기록한다. 직접 만든 직무는 custom-job-store.ts에서 만들고 지운다.
export type JobPicks = { added: PresetJob[]; removed: PresetJob[] };
const EMPTY_PICKS: JobPicks = { added: [], removed: [] };

const listeners = new Set<() => void>();
let currentJob: TargetJob | null | undefined;
let currentPicks: JobPicks | undefined;

export function customTargetJob(id: string): TargetJob {
  return `${CUSTOM_PREFIX}${id}`;
}

export function customJobIdOf(job: string): string | undefined {
  return job.startsWith(CUSTOM_PREFIX) ? job.slice(CUSTOM_PREFIX.length) : undefined;
}

export function isPresetJob(value: unknown): value is PresetJob {
  return (PRESET_JOBS as readonly unknown[]).includes(value);
}

// 추천 직무이거나, 주어진 만든 직무 목록에 있는 직무인지
export function isTargetJob(value: unknown, customJobs: readonly Pick<CustomJob, "id">[]): value is TargetJob {
  if (isPresetJob(value)) return true;
  if (typeof value !== "string") return false;
  const id = customJobIdOf(value);
  return id !== undefined && customJobs.some((j) => j.id === id);
}

export function isJobPicks(value: unknown): value is JobPicks {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    Object.keys(v).every((key) => key === "added" || key === "removed") &&
    Array.isArray(v.added) &&
    v.added.every(isPresetJob) &&
    Array.isArray(v.removed) &&
    v.removed.every(isPresetJob)
  );
}

export function readTargetJob(): TargetJob | undefined {
  try {
    const saved = localStorage.getItem(TARGET_JOB_KEY);
    return isTargetJob(saved, readCustomJobs()) ? saved : undefined;
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

// 화면에 보여 줄 직무 이름과 필요한 역량.
// 직접 만든 직무가 하나라도 있으면 추천(예시) 직무는 쓰지 않는다. 고른 직무가 없으면 첫 만든 직무.
// 만든 직무가 하나도 없을 때만 추천 직무를 보여 준다.
export function resolveTargetJob(job: TargetJob, customJobs: readonly CustomJob[]) {
  const id = customJobIdOf(job);
  const custom = (id ? customJobs.find((j) => j.id === id) : undefined) ?? customJobs[0];
  if (custom) {
    return { job: customTargetJob(custom.id), name: custom.name, competencies: custom.competencies, custom } as const;
  }
  const preset = isPresetJob(job) ? job : PRESET_JOBS[0];
  return {
    job: preset as TargetJob,
    name: preset,
    competencies: JOB_COMPETENCIES[preset] as readonly string[],
    jobSkills: JOB_SKILLS[preset] as readonly string[],
    custom: undefined,
  } as const;
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

function getDefaultedJob(): TargetJob {
  return getJob() ?? PRESET_JOBS[0];
}

function getPicks() {
  if (currentPicks === undefined) currentPicks = readJobPicks() ?? EMPTY_PICKS;
  return currentPicks;
}

// 저장한 직무가 없으면 null. 추천 직무 중 무엇을 보여 줄지는 공백 지도 화면이 칩 목록으로 정한다.
export function useSavedTargetJob() {
  return useSyncExternalStore(subscribe, getJob, () => null);
}

// 저장한 직무가 없으면 첫 추천 직무
export function useTargetJob() {
  return useSyncExternalStore(subscribe, getDefaultedJob, () => PRESET_JOBS[0] as TargetJob);
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
export function addTargetJob(job: PresetJob) {
  const { added, removed } = getPicks();
  setPicks({ added: [...added.filter((j) => j !== job), job], removed: removed.filter((j) => j !== job) });
  setTargetJob(job);
}

// X로 뺀 직무는 다시 추천돼도 나오지 않는다. ＋로만 다시 넣는다.
export function removeTargetJob(job: PresetJob) {
  const { added, removed } = getPicks();
  setPicks({ added: added.filter((j) => j !== job), removed: [...removed.filter((j) => j !== job), job] });
}
