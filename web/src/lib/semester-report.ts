// 학기 결산서 계산. 화면 코드 없이 함수만 둔다. AI는 쓰지 않는다.
//
// 확인용 예시 (시안 05와 같은 숫자)
// 1) 합계 187시간 ÷ 15학점 = 학점당 12.5시간
// 2) 예상 평점: (4.5 + 4 + 4.5 + 4 + 3.5) × 3학점 ÷ 15학점 = 4.10
// 3) 데이터과학입문: 26시간 ÷ 3학점 = 학점당 8.7시간, 가성비 = 4.5 ÷ 8.67 × 100 = 52

import { LAST_WEEK, weekNumberOf } from "./risk";

export const SEMESTER_LABEL = "2026-2학기";
export const DEFAULT_CREDITS = 3;
// 학점 없는 공부(토익 등)는 credits 0으로 결산에서 뺀다.
export const CREDIT_CHOICES = [1, 2, 3, 4] as const;
// 집중 기록이 이만큼 쌓이기 전에는 예시 데이터를 보여 준다.
export const MIN_REPORT_WEEKS = 3;

const GRADE_POINTS = {
  "A+": 4.5,
  A0: 4,
  "B+": 3.5,
  B0: 3,
  "C+": 2.5,
  C0: 2,
  "D+": 1.5,
  D0: 1,
  F: 0,
} as const;

export type LetterGrade = keyof typeof GRADE_POINTS;
export const LETTER_GRADES = Object.keys(GRADE_POINTS) as LetterGrade[];
export const MAX_GPA = GRADE_POINTS["A+"];

export type SemesterCourse = { credits: number; grade?: LetterGrade };
export type SemesterData = Record<string, SemesterCourse>;

export type CourseInput = { course: string; minutes: number; credits: number; grade?: LetterGrade };

export type CourseBadge = "best" | "worst" | "no-record" | "no-grade";

export type CourseReport = {
  course: string;
  credits: number;
  grade?: LetterGrade;
  hours: number;
  hoursPerCredit: number;
  value: number | null; // 가성비. 기록이나 성적이 없으면 계산하지 않는다.
  barPercent: number;
  badge?: CourseBadge;
};

export type SemesterReport = {
  totalHours: number;
  earnedCredits: number;
  gpa: number | null;
  hoursPerCredit: number | null;
  courses: CourseReport[];
  excluded: string[];
};

// 시안 05의 예시. 저장하지 않는다.
export const EXAMPLE_COURSES: CourseInput[] = [
  { course: "데이터과학입문", minutes: 26 * 60, credits: 3, grade: "A+" },
  { course: "조직행동론", minutes: 24 * 60, credits: 3, grade: "A0" },
  { course: "마케팅원론", minutes: 38 * 60, credits: 3, grade: "A+" },
  { course: "회계원리", minutes: 47 * 60, credits: 3, grade: "A0" },
  { course: "경영통계", minutes: 52 * 60, credits: 3, grade: "B+" },
];

export function buildCourseReport(inputs: CourseInput[]): SemesterReport {
  const counted = inputs.filter((input) => input.credits > 0);

  const scored = counted.map((input): CourseReport => {
    const hours = input.minutes / 60;
    const hoursPerCredit = hours / input.credits;
    const value =
      hours > 0 && input.grade !== undefined ? Math.round((GRADE_POINTS[input.grade] / hoursPerCredit) * 100) : null;
    return { course: input.course, credits: input.credits, grade: input.grade, hours, hoursPerCredit, value, barPercent: 0 };
  });

  const ranked = scored
    .filter((course) => course.value !== null)
    .sort((a, b) => (b.value as number) - (a.value as number));
  const unranked = scored.filter((course) => course.value === null);
  const top = ranked[0]?.value ?? 0;
  ranked.forEach((course, index) => {
    course.barPercent = top > 0 ? ((course.value as number) / top) * 100 : 0;
    if (ranked.length >= 2 && index === 0) course.badge = "best";
    if (ranked.length >= 2 && index === ranked.length - 1) course.badge = "worst";
  });
  unranked.forEach((course) => {
    course.badge = course.hours === 0 ? "no-record" : "no-grade";
  });

  const totalHours = scored.reduce((sum, course) => sum + course.hours, 0);
  const allCredits = scored.reduce((sum, course) => sum + course.credits, 0);
  // F는 평점에는 들어가지만 학점을 얻지는 못한다.
  const earnedCredits = scored.reduce((sum, course) => sum + (course.grade === "F" ? 0 : course.credits), 0);
  const graded = scored.filter((course) => course.grade !== undefined);
  const gradedCredits = graded.reduce((sum, course) => sum + course.credits, 0);

  return {
    totalHours,
    earnedCredits,
    gpa:
      gradedCredits > 0
        ? graded.reduce((sum, course) => sum + GRADE_POINTS[course.grade as LetterGrade] * course.credits, 0) / gradedCredits
        : null,
    hoursPerCredit: allCredits > 0 ? totalHours / allCredits : null,
    courses: [...ranked, ...unranked],
    excluded: inputs.filter((input) => input.credits <= 0).map((input) => input.course),
  };
}

type FocusRecord = { subject: string; minutes: number; finishedAt: number; deadlineId?: string; activityId?: string };
type DeadlineInfo = { id: string; course: string; source?: string };

function ymdOf(time: number) {
  return new Date(time).toLocaleDateString("sv-SE");
}

function weekOfRecord(record: FocusRecord) {
  return weekNumberOf(ymdOf(record.finishedAt));
}

// 이번 학기의 수업 공부 기록만 남긴다. 대외활동과 공고 일정에서 시작한 기록은 뺀다.
export function semesterRecords<T extends FocusRecord>(records: T[], deadlines: DeadlineInfo[]) {
  const postingIds = new Set(deadlines.filter((d) => d.source).map((d) => d.id));
  return records.filter((record) => {
    if (record.activityId || (record.deadlineId && postingIds.has(record.deadlineId))) return false;
    const week = weekOfRecord(record);
    return week >= 1 && week <= LAST_WEEK;
  });
}

export function recordedWeeks(records: FocusRecord[]) {
  return new Set(records.map(weekOfRecord)).size;
}

// 지난 주차 수. 학기 전이면 1, 학기가 끝났으면 마지막 주차다.
export function reportWeek(today: string) {
  return Math.min(LAST_WEEK, Math.max(1, weekNumberOf(today)));
}

export function isSemesterOver(today: string) {
  return weekNumberOf(today) > LAST_WEEK;
}

function settingOf(settings: SemesterData, course: string): SemesterCourse {
  return Object.hasOwn(settings, course) ? settings[course] : { credits: DEFAULT_CREDITS };
}

// 시간표·일정·집중 기록에 나온 과목을 모두 모아 입력값을 만든다. 공고 일정은 과목이 아니다.
export function collectCourseInputs(
  timetable: { course: string }[],
  deadlines: DeadlineInfo[],
  records: FocusRecord[],
  settings: SemesterData,
): CourseInput[] {
  const names = [
    ...timetable.map((slot) => slot.course),
    ...deadlines.filter((d) => !d.source).map((d) => d.course),
    ...records.map((record) => record.subject),
  ]
    .map((name) => name.trim())
    .filter(Boolean);

  const minutes = new Map<string, number>();
  for (const record of records) {
    const name = record.subject.trim();
    minutes.set(name, (minutes.get(name) ?? 0) + record.minutes);
  }

  return [...new Set(names)].map((course) => {
    const { credits, grade } = settingOf(settings, course);
    return { course, minutes: minutes.get(course) ?? 0, credits, ...(grade ? { grade } : {}) };
  });
}

// 0.0 없이 소수 한 자리까지 적는다.
export function formatHours(hours: number) {
  return String(Math.round(hours * 10) / 10);
}
