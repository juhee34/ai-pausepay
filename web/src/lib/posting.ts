// 공고·자격증 → 일정 기능에서 화면과 서버가 같이 쓰는 값.

import type { ActivityKind } from "./activity-kinds";

export const MAX_POSTING_TEXT = 4000;
export const POSTING_IMAGE_TYPES = ["image/png", "image/jpeg"] as const;

export const POSTING_EVENTS = [
  "서류 마감",
  "결과 발표",
  "면접",
  "활동 시작",
  "활동 끝",
  "접수 마감",
  "시험일",
  "기타",
] as const;
export type PostingEventName = (typeof POSTING_EVENTS)[number];

export type PostingEvent = {
  title: PostingEventName;
  date: string | null; // YYYY-MM-DD. 공고에 날짜가 없으면 null이고 사용자가 넣는다.
  time: string | null;
  rawText: string; // 공고에 적힌 그대로의 시기
};

export type PostingResult = {
  org: string;
  title: string;
  kind: ActivityKind;
  events: PostingEvent[];
};

// 대외활동 목록에 카드를 기본으로 만드는 종류 (docs/프롬프트.md 11)
export const CARD_KINDS: readonly ActivityKind[] = ["대외활동", "공모전", "인턴"];

export function isPostingImage(type: string) {
  return (POSTING_IMAGE_TYPES as readonly string[]).includes(type);
}

// 붙여 넣은 글에 그 날짜의 월·일 숫자가 있는지. 없으면 AI가 만든 날짜로 보고 사용자에게 묻는다.
export function dateAppearsInText(ymd: string, text: string) {
  const numbers = new Set((text.match(/\d+/g) ?? []).map(Number));
  return numbers.has(Number(ymd.slice(5, 7))) && numbers.has(Number(ymd.slice(8)));
}
