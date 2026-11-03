// 홈에서 쓰는 계산: 하루 일정 줄 세우기, 다음 수업, 빈 시간, 지금 할 일 후보.
// 화면 없이 계산만 해서, 나중에 AI 추천을 붙여도 이 파일만 바꾸면 된다.

import type { BadgeKind } from "@/components/ui/badge";
import type { Activity } from "./activity-store";
import { addDays, dDayLabel, daysUntil } from "./briefing";
import type { SavedDeadline } from "./deadline-store";
import type { DeadlineKind } from "./syllabus";
import { WEEKDAYS, type ClassSlot, type Weekday } from "./timetable";

export type PlanItem =
  | { type: "class"; key: string; slot: ClassSlot & { start: string; end: string } }
  | { type: "class-untimed"; key: string; slot: ClassSlot }
  | { type: "deadline"; key: string; deadline: SavedDeadline }
  | { type: "activity"; key: string; activity: Activity };

export const BADGE_OF: Record<DeadlineKind, BadgeKind | null> = {
  과제: "assignment",
  퀴즈: "quiz",
  중간: "exam",
  기말: "exam",
  기타: null,
};

export function toMinutes(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

export function weekdayOf(ymd: string): Weekday {
  const day = new Date(`${ymd}T00:00:00`).getDay(); // 0 = 일요일
  return WEEKDAYS[(day + 6) % 7];
}

export function mondayOf(ymd: string) {
  return addDays(ymd, -WEEKDAYS.indexOf(weekdayOf(ymd)));
}

export function formatKoreanDate(ymd: string) {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}월 ${d}일 ${weekdayOf(ymd)}요일`;
}

// "3h 후", "40분 후". 폭 375px 폰의 요약 칸에 들어가도록 시간 단위는 반올림한다.
export function formatUntil(minutes: number) {
  if (minutes < 60) return `${minutes}분 후`;
  return `${Math.round(minutes / 60)}h 후`;
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

// 그날 할 일. 시각 없는 마감·대외활동·시간 미정 수업이 위, 시각 있는 수업이 아래(시각 순).
export function buildDayPlan(
  date: string,
  timetable: ClassSlot[],
  deadlines: SavedDeadline[],
  activities: Activity[],
): { untimed: PlanItem[]; timed: Extract<PlanItem, { type: "class" }>[] } {
  const day = weekdayOf(date);
  const classes = timetable.filter((s) => s.day === day);

  const timed = classes
    .filter((s): s is ClassSlot & { start: string; end: string } => Boolean(s.start && s.end))
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((slot, i) => ({ type: "class" as const, key: `c-${i}-${slot.start}`, slot }));

  const untimed: PlanItem[] = [
    ...deadlines
      .filter((d) => d.date === date)
      .map((deadline) => ({ type: "deadline" as const, key: `d-${deadline.id}`, deadline })),
    ...activities
      .filter((a) => a.date === date)
      .map((activity) => ({ type: "activity" as const, key: `a-${activity.id}`, activity })),
    ...classes
      .filter((s) => !s.start)
      .map((slot, i) => ({ type: "class-untimed" as const, key: `u-${i}-${slot.course}`, slot })),
  ];

  return { untimed, timed };
}

// 지금 이후 첫 수업. 오늘 남은 수업이 없으면 다음 날들에서 찾는다 (최대 일주일).
export function findNextClass(today: string, nowMinutes: number, timetable: ClassSlot[]) {
  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(today, offset);
    const next = timetable
      .filter((s) => s.day === weekdayOf(date) && s.start)
      .filter((s) => offset > 0 || toMinutes(s.start!) > nowMinutes)
      .sort((a, b) => a.start!.localeCompare(b.start!))[0];
    if (next) return { slot: next, offset, date };
  }
  return null;
}

// 지금부터 오늘 다음 수업까지 비는 시간(분). 오늘 남은 수업이 없으면 null.
export function freeMinutesUntilNextClass(
  nowMinutes: number,
  timed: Extract<PlanItem, { type: "class" }>[],
) {
  if (timed.some((c) => toMinutes(c.slot.start) <= nowMinutes && toMinutes(c.slot.end) > nowMinutes)) {
    return 0; // 수업 중
  }
  const next = timed.find((c) => toMinutes(c.slot.start) > nowMinutes);
  return next ? toMinutes(next.slot.start) - nowMinutes : null;
}

// 지금 할 일 후보: 2주 안의 끝내지 않은 마감, 가까운 순.
// 지금은 규칙으로 고르고, AI 한 줄 추천은 홈에서 첫 후보에만 덧붙인다.
export function pickCandidates(today: string, deadlines: SavedDeadline[]) {
  const until = addDays(today, 14);
  return deadlines
    .filter((d) => !d.done && d.date >= today && d.date <= until)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function dDay(today: string, date: string) {
  return dDayLabel(daysUntil(today, date));
}
