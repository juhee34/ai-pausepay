// 시간표 한 칸. KLAS 시간표 캡쳐에서 AI가 읽고, 사용자가 확인한 뒤 폰에만 저장한다.
// 캡쳐 파일 검사(종류·4MB)는 강의계획서와 같은 lib/syllabus.ts의 것을 쓴다.

export const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type ClassSlot = {
  course: string;
  day: Weekday;
  start: string | null; // HH:mm. 온라인 강의처럼 시간이 없으면 null
  end: string | null;
  room: string;
  professor: string;
};

export const MAX_SLOTS = 40;
export const MAX_TEXT_LENGTH = 40;

export function isHm(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isClassSlot(value: unknown): value is ClassSlot {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.course === "string" &&
    (WEEKDAYS as readonly unknown[]).includes(s.day) &&
    (s.start === null || isHm(s.start)) &&
    (s.end === null || isHm(s.end)) &&
    typeof s.room === "string" &&
    typeof s.professor === "string"
  );
}

// 요일 → 시작 시각 순서. 시간 없는 수업은 그 요일 맨 뒤.
export function sortSlots<T extends ClassSlot>(slots: T[]) {
  return [...slots].sort(
    (a, b) =>
      WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day) ||
      (a.start ?? "99:99").localeCompare(b.start ?? "99:99"),
  );
}
