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

// 매일 무료 쿠키 DAILY_AI_LIMIT개. AI 기능을 한 번 쓸 때마다 1개씩 쓴다.
// 홈을 열면 자동으로 도는 브리핑은 무료 쿠키를 쓰지 않고 따로 센다. 화면은 하루 3번까지 부르고, 서버는 5번에서 막는다.
export const BRIEFING_DAILY_LIMIT = 5;
// 브리핑 예약은 id 앞에 'b-'를 붙여 무료 쿠키 예약과 구분한다.
export const BRIEFING_LEASE_PREFIX = "b-";
export const isBriefingLease = (id: string) => id.startsWith(BRIEFING_LEASE_PREFIX);
// 무료 쿠키를 쓴 횟수: 브리핑을 뺀 성공 횟수. 충전한 쿠키로 쓴 횟수도 들어가지만, 그때는 이미 무료 쿠키가 0개다.
export const freeCounted = (counts: FeatureCounts) => totalCounts(counts) - counts.briefing;
export function freeCookiesLeft(counts: FeatureCounts, pendingIds: string[]) {
  const pending = pendingIds.filter((id) => !isBriefingLease(id)).length;
  return Math.max(0, DAILY_AI_LIMIT - freeCounted(counts) - pending);
}
export type UsageSummary = {
  today: string; weekStart: string; dailyLimit: number; usedToday: number;
  remaining: number; todayCounts: FeatureCounts; weekCounts: FeatureCounts;
};
