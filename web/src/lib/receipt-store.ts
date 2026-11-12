"use client";

// 사용자가 확인·수정한 스펙 영수증을 이 기기 브라우저(localStorage)에만 보관한다.
// 구조는 deadline-store.ts와 같다.

import { useSyncExternalStore } from "react";
import { MAX_SPEC_FIELD, SPEC_KINDS, SPEC_KIND_IDS, normalizeCompetencies, type SpecKind } from "./competencies";
import type { ReceiptAnswers, ReceiptStar, SpecDetail } from "./receipt";

// kind·detail은 11/12에 더한 선택 칸이라 옛 영수증에는 없다.
// 간단 기록도 같은 모양으로 저장한다 (STAR 칸은 빈 글자, 한 줄 메모는 oneLiner).
export type Receipt = ReceiptStar & {
  id: string;
  activityId?: string;
  title: string;
  period?: string;
  kind?: SpecKind;
  detail?: SpecDetail;
  answers: ReceiptAnswers;
  createdAt: number;
};

export const RECEIPTS_KEY = "unis.receipts.v1";
const EMPTY: Receipt[] = [];

let cache: Receipt[] | null = null;
const listeners = new Set<() => void>();

const DETAIL_KEYS = new Set<string>(SPEC_KINDS.flatMap((k) => k.fields.map((f) => f.key)));

function isSpecDetail(value: unknown): value is SpecDetail {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(
    ([key, text]) => DETAIL_KEYS.has(key) && typeof text === "string" && text.length <= MAX_SPEC_FIELD,
  );
}

export function isReceipt(value: unknown): value is Receipt {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  const a = r.answers as Record<string, unknown> | null | undefined;
  return (
    typeof r.id === "string" &&
    typeof r.title === "string" &&
    (r.activityId === undefined || typeof r.activityId === "string") &&
    (r.period === undefined || typeof r.period === "string") &&
    (r.kind === undefined || (SPEC_KIND_IDS as readonly unknown[]).includes(r.kind)) &&
    (r.detail === undefined || isSpecDetail(r.detail)) &&
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
    // 옛 역량 이름은 읽을 때 새 이름으로 바꾼다. 다음에 저장할 때 새 이름으로 써진다.
    return Array.isArray(parsed)
      ? parsed.filter(isReceipt).map((r) => ({ ...r, competencies: normalizeCompetencies(r.competencies) }))
      : [];
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

export type ReceiptUpdate = ReceiptStar & Pick<Receipt, "title" | "period" | "kind" | "detail"> & {
  answers?: ReceiptAnswers;
};

export function updateReceipt(id: string, fields: ReceiptUpdate) {
  write(getSnapshot().map((r) => (r.id === id ? { ...r, ...fields } : r)));
}

export type SimpleRecord = Pick<Receipt, "title" | "period" | "kind" | "detail" | "activityId" | "competencies"> & {
  memo: string;
};

// AI 없이 남기는 짧은 기록. 공백 지도에서는 영수증 한 장으로 센다.
export function simpleRecordFields({ memo, ...rest }: SimpleRecord) {
  return {
    ...rest,
    situation: "",
    task: "",
    action: "",
    result: "",
    oneLiner: memo.trim(),
    answers: { what: memo.trim(), role: "", result: "", learned: "" },
  };
}

export function addSimpleRecord(record: SimpleRecord) {
  addReceipt(simpleRecordFields(record));
}

export function removeReceipt(id: string) {
  write(getSnapshot().filter((r) => r.id !== id));
}
