// 화면과 서버가 공유하는 집계 기준. 사용자 입력은 저장하지 않는다.
export const AI_FEATURES = {
  syllabus: "강의계획서", timetable: "시간표 캡쳐", briefing: "오늘의 브리핑",
  exam: "시험 대비", mail: "교수님 메일", posting: "취준 일정", receipt: "스펙 영수증", scores: "점수표 읽기",
} as const;
export type AiFeature = keyof typeof AI_FEATURES;
export const DAILY_AI_LIMIT = 20;
export type FeatureCounts = Record<AiFeature, number>;
export function emptyCounts(): FeatureCounts {
  return Object.fromEntries(Object.keys(AI_FEATURES).map((key) => [key, 0])) as FeatureCounts;
}
export function seoulDay(now = new Date()) {
  return now.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}
export function weekStart(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date.toISOString().slice(0, 10);
}
export function readCounts(value: unknown): FeatureCounts {
  const counts = emptyCounts();
  if (!value || typeof value !== "object") return counts;
  for (const key of Object.keys(counts) as AiFeature[]) {
    const n = (value as Record<string, unknown>)[key];
    if (typeof n === "number" && Number.isSafeInteger(n) && n >= 0) counts[key] = n;
  }
  return counts;
}
export const totalCounts = (counts: FeatureCounts) => Object.values(counts).reduce((a, b) => a + b, 0);
export type UsageSummary = {
  today: string; weekStart: string; dailyLimit: number; usedToday: number;
  remaining: number; todayCounts: FeatureCounts; weekCounts: FeatureCounts;
};
