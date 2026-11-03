// 강의계획서 → 캘린더 기능에서 화면과 서버가 같이 쓰는 값.
// 화면에서도 불러오므로 zod 같은 서버용 패키지는 여기서 쓰지 않는다.

// Vercel은 요청 하나를 4.5MB까지만 받으므로, 여유를 두고 4MB에서 막는다.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;
export type AcceptedType = (typeof ACCEPTED_TYPES)[number];

export const DEADLINE_KINDS = ["과제", "퀴즈", "중간", "기말", "기타"] as const;
export type DeadlineKind = (typeof DEADLINE_KINDS)[number];

export const GRADING_NAMES = ["중간", "기말", "과제", "퀴즈", "출석", "기타"] as const;
export type GradingName = (typeof GRADING_NAMES)[number];
export type SyllabusGrading = { name: GradingName; weight: number };
export type GradingDraft = { name: GradingName; weight: string };

// 빈칸을 0으로 추측하지 않는다. 0% 항목은 기말 계산 저장소에 넣지 않는다.
export function reviewGrading(drafts: GradingDraft[]) {
  const entered = drafts.filter((item) => item.weight.trim() !== "");
  const invalid = entered.some((item) => {
    const weight = Number(item.weight);
    return !Number.isFinite(weight) || weight < 0 || weight > 100;
  });
  const items = entered
    .map(({ name, weight }) => ({ name, weight: Number(weight) }))
    .filter((item) => Number.isFinite(item.weight) && item.weight > 0 && item.weight <= 100);
  const total = Math.round(items.reduce((sum, item) => sum + item.weight, 0) * 100) / 100;
  return { items, total, invalid, needsReview: invalid || total !== 100 };
}

export type Deadline = {
  course: string;
  title: string;
  // YYYY-MM-DD. "8주차"처럼 날짜가 적혀 있지 않으면 null이고, 사용자가 직접 넣는다.
  date: string | null;
  when: string; // 자료에 적힌 그대로의 시기 (예: "8주차", "10월 21일(수) 18:00")
  kind: DeadlineKind;
};

export function isAcceptedType(type: string): type is AcceptedType {
  return (ACCEPTED_TYPES as readonly string[]).includes(type);
}

// "2026-11-18" → "11월 18일 (수)"
export function formatDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}
