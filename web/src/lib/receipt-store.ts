"use client";

// 사용자가 확인·수정한 스펙 영수증을 이 기기 브라우저(localStorage)에만 보관한다.
// 구조는 deadline-store.ts와 같다.

import { useSyncExternalStore } from "react";
import type { ReceiptAnswers, ReceiptStar } from "./receipt";

export type Receipt = ReceiptStar & {
  id: string;
  activityId?: string;
  title: string;
  period?: string;
  answers: ReceiptAnswers;
  createdAt: number;
};

export const RECEIPTS_KEY = "unis.receipts.v1";
const EMPTY: Receipt[] = [];

let cache: Receipt[] | null = null;
const listeners = new Set<() => void>();

export function isReceipt(value: unknown): value is Receipt {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  const a = r.answers as Record<string, unknown> | null | undefined;
  return (
    typeof r.id === "string" &&
    typeof r.title === "string" &&
    (r.activityId === undefined || typeof r.activityId === "string") &&
    (r.period === undefined || typeof r.period === "string") &&
    !!a &&
    typeof a === "object" &&
    [a.what, a.role, a.result, a.learned].every((text) => typeof text === "string") &&
    [r.situation, r.task, r.action, r.result, r.oneLiner].every((text) => typeof text === "string") &&
    Array.isArray(r.competencies) &&
    r.competencies.every((name) => typeof name === "string") &&
    typeof r.createdAt === "number" &&
    Number.isFinite(r.createdAt)
  );
}

function read(): Receipt[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECEIPTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isReceipt) : [];
  } catch {
    return [];
  }
}

function write(list: Receipt[]) {
  const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);
  localStorage.setItem(RECEIPTS_KEY, JSON.stringify(sorted));
  cache = sorted;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 다른 탭에서 바뀐 것도 반영한다.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== RECEIPTS_KEY) return;
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

export function useReceipts() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function addReceipt(receipt: Omit<Receipt, "id" | "createdAt">) {
  write([...getSnapshot(), { ...receipt, id: crypto.randomUUID(), createdAt: Date.now() }]);
}

export function updateReceipt(id: string, fields: ReceiptStar & Pick<Receipt, "title" | "period">) {
  write(getSnapshot().map((r) => (r.id === id ? { ...r, ...fields } : r)));
}

export function removeReceipt(id: string) {
  write(getSnapshot().filter((r) => r.id !== id));
}
