// 스펙 영수증 공용 규칙. 서버(AI 답 검사)와 화면이 같이 쓴다.

import { SPEC_KINDS, type SpecKind } from "./competencies";

export const MAX_RECEIPT_ANSWER = 600;
export const MAX_RECEIPT_TITLE = 40;
export const MAX_RECEIPT_PERIOD = 40;
export const MAX_ONE_LINER = 80;
export const MAX_COMPETENCIES = 3;
export const NEED_NUMBER_NOTE = "[숫자를 넣으면 더 좋아요]";

export type ReceiptAnswers = { what: string; role: string; result: string; learned: string };

// AI가 정리해 사용자가 확인·수정하는 부분
export type ReceiptStar = {
  situation: string;
  task: string;
  action: string;
  result: string;
  oneLiner: string;
  competencies: string[];
};

function numbersIn(text: string) {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ""));
}

// 답에 나온 숫자 중 입력에 없는 것. '세 명'처럼 글자로 쓴 수는 잡지 못한다.
export function findInventedNumbers(output: string[], input: string[]) {
  const known = new Set(input.flatMap(numbersIn));
  return [...new Set(output.flatMap(numbersIn))].filter((n) => !known.has(n));
}

// 입력한 결과에 숫자가 없을 때만 안내를 붙인다.
export function applyNumberNote(result: string, answerResult: string) {
  const clean = result.replaceAll(NEED_NUMBER_NOTE, "").trim();
  return /\d/.test(answerResult) ? clean : `${clean} ${NEED_NUMBER_NOTE}`.trim();
}

// 구분별 칸 값. 기간은 영수증의 period에 따로 둔다.
export type SpecDetail = Record<string, string>;

// STAR 칸이 모두 비어 있으면 '간단 기록'이다. 자격증·어학처럼 짧게 남긴 기록.
export function isSimpleStar(r: Pick<ReceiptStar, "situation" | "task" | "action" | "result">) {
  return [r.situation, r.task, r.action, r.result].every((text) => text.trim() === "");
}

export function specKindOf(kind: SpecKind | undefined) {
  return SPEC_KINDS.find((k) => k.id === kind);
}

// "점수·등급 TOEIC 870 · 응시일 2026.5"처럼 칸 값을 한 줄로
export function formatSpecDetail(kind: SpecKind | undefined, detail: SpecDetail | undefined) {
  const spec = specKindOf(kind);
  if (!spec || !detail) return "";
  return spec.fields
    .filter((f) => f.key !== "period" && detail[f.key]?.trim())
    .map((f) => `${f.label} ${detail[f.key].trim()}`)
    .join(" · ");
}

export function formatReceiptText(
  r: ReceiptStar & { title: string; period?: string; kind?: SpecKind; detail?: SpecDetail },
) {
  const head = r.period ? `${r.title} (${r.period})` : r.title;
  const spec = specKindOf(r.kind);
  const detail = formatSpecDetail(r.kind, r.detail);
  return [
    spec ? `[${spec.label}] ${head}` : head,
    ...(detail ? [detail] : []),
    ...(r.oneLiner.trim() ? [`한 줄: ${r.oneLiner}`] : []),
    ...(isSimpleStar(r)
      ? []
      : [`상황: ${r.situation}`, `과제: ${r.task}`, `행동: ${r.action}`, `결과: ${r.result}`]),
    `역량: ${r.competencies.join(", ")}`,
  ].join("\n");
}
