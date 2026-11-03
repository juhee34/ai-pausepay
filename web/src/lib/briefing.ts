"use client";

// 오늘의 브리핑(홈)에서 쓰는 날짜 계산과 '지금 시작할 일' 규칙.

import { useSyncExternalStore } from "react";
import type { DeadlineKind } from "./syllabus";

export type BriefingItem = {
  type: "일정" | "대외활동";
  title: string;
  course: string;
  date: string; // YYYY-MM-DD
  kind: DeadlineKind | "대외활동";
};

export function toYmd(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(ymd: string, days: number) {
  const date = parseYmd(ymd);
  date.setDate(date.getDate() + days);
  return toYmd(date);
}

export function daysUntil(today: string, ymd: string) {
  return Math.round((parseYmd(ymd).getTime() - parseYmd(today).getTime()) / 86_400_000);
}

export function dDayLabel(days: number) {
  return days === 0 ? "D-day" : `D-${days}`;
}

// 오늘 날짜는 서버(빌드 시점)와 폰이 다를 수 있으므로 폰에서만 계산한다.
// 화면을 연 채로 자정을 넘기는 경우는 다시 열면 맞춰진다.
const noop = () => () => {};
export function useToday() {
  return useSyncExternalStore(noop, () => toYmd(new Date()), () => null);
}

// 지금 시각(자정부터 몇 분). 현재 시각 선·다음 수업 계산용으로 30초마다 다시 읽는다.
function everyHalfMinute(listener: () => void) {
  const id = setInterval(listener, 30_000);
  return () => clearInterval(id);
}
export function useNowMinutes() {
  return useSyncExternalStore(
    everyHalfMinute,
    () => {
      const now = new Date();
      return now.getHours() * 60 + now.getMinutes();
    },
    () => null,
  );
}

// AI를 못 쓸 때 보여 주는 정해진 문장. 가장 가까운 일부터 고른다.
export function ruleBasedPick(today: string, items: BriefingItem[]) {
  const next = [...items]
    .filter((item) => item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!next) return null;

  const days = daysUntil(today, next.date);
  if (next.type === "대외활동") {
    return days === 0
      ? `오늘 ${next.title} 일정이 있어요. 준비물부터 챙겨 볼까요?`
      : `${dDayLabel(days)} · ${next.title} 전에 미리 준비해 두세요.`;
  }
  if (days === 0) return `오늘 마감이에요 · ${next.title}부터 끝내세요.`;
  const isExam = next.kind === "중간" || next.kind === "기말" || next.kind === "퀴즈";
  return isExam
    ? `${dDayLabel(days)} · ${next.title} 공부부터 시작해 보세요.`
    : `${dDayLabel(days)} · ${next.title}부터 시작해 보세요.`;
}
