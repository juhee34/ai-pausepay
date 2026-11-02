// 강의계획서 → 캘린더 기능에서 화면과 서버가 같이 쓰는 값.
// 화면에서도 불러오므로 zod 같은 서버용 패키지는 여기서 쓰지 않는다.

// Vercel은 요청 하나를 4.5MB까지만 받으므로, 여유를 두고 4MB에서 막는다.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;
export type AcceptedType = (typeof ACCEPTED_TYPES)[number];

export const DEADLINE_KINDS = ["과제", "퀴즈", "중간", "기말", "기타"] as const;
export type DeadlineKind = (typeof DEADLINE_KINDS)[number];

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
