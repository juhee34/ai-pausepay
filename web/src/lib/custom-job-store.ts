"use client";

// 학생이 직접 만든 목표 직무. 역량 공백 지도의 추천 직무 4개 옆에 나온다.
// 이 기기 브라우저(localStorage)에 보관하고 파일·계정 백업에도 넣는다. 구조는 receipt-store.ts와 같다.

import { useSyncExternalStore } from "react";
import { CUSTOM_JOB_MAX, CUSTOM_JOB_MIN, normalizeCompetencies } from "./competencies";

export type CustomJob = {
  id: string;
  name: string;
  competencies: string[];
  createdAt: number;
};

export const CUSTOM_JOBS_KEY = "unis.customJobs.v1";
export const MAX_CUSTOM_JOB_NAME = 20;
export const MAX_CUSTOM_JOBS = 20;
const EMPTY: CustomJob[] = [];

let cache: CustomJob[] | null = null;
const listeners = new Set<() => void>();

export function isCustomJob(value: unknown): value is CustomJob {
  if (!value || typeof value !== "object") return false;
  const j = value as Record<string, unknown>;
  return (
    typeof j.id === "string" &&
    /^[A-Za-z0-9-]{1,64}$/.test(j.id) &&
    typeof j.name === "string" &&
    j.name.trim().length > 0 &&
    j.name.length <= MAX_CUSTOM_JOB_NAME &&
    Array.isArray(j.competencies) &&
    j.competencies.length >= CUSTOM_JOB_MIN &&
    j.competencies.length <= CUSTOM_JOB_MAX &&
    j.competencies.every((name) => typeof name === "string") &&
    typeof j.createdAt === "number" &&
    Number.isFinite(j.createdAt)
  );
}

export function readCustomJobs(): CustomJob[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CUSTOM_JOBS_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter(isCustomJob).map((j) => ({ ...j, competencies: normalizeCompetencies(j.competencies) }))
      : [];
  } catch {
    return [];
  }
}

function write(list: CustomJob[]) {
  const sorted = [...list].sort((a, b) => a.createdAt - b.createdAt);
  localStorage.setItem(CUSTOM_JOBS_KEY, JSON.stringify(sorted));
  cache = sorted;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== CUSTOM_JOBS_KEY) return;
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
  if (cache === null) cache = readCustomJobs();
  return cache;
}

export function useCustomJobs() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export type CustomJobFields = Pick<CustomJob, "name" | "competencies">;

// 새로 만든 직무의 id를 돌려준다.
export function addCustomJob({ name, competencies }: CustomJobFields) {
  const id = crypto.randomUUID();
  write([...getSnapshot(), { id, name: name.trim(), competencies, createdAt: Date.now() }]);
  return id;
}

export function updateCustomJob(id: string, { name, competencies }: CustomJobFields) {
  write(getSnapshot().map((j) => (j.id === id ? { ...j, name: name.trim(), competencies } : j)));
}

export function removeCustomJob(id: string) {
  write(getSnapshot().filter((j) => j.id !== id));
}
