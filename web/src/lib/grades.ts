// 기말 필요 점수 계산. 화면 코드 없이 함수만 둔다. AI는 쓰지 않는다.
//
// 확인용 예시 (평가 항목: 중간 30, 과제 20, 퀴즈 10, 출석 10, 기말 30 / 목표 85)
// 1) 받은 점수 24, 18, 8, 10 → 확보 60 → (85 - 60) ÷ 30 × 100 = 83.3점, 주의
// 2) 받은 점수 26, 18, 10, 10 → 확보 64 → (85 - 64) ÷ 30 × 100 = 70.0점, 주의
// 3) 받은 점수 18, 12, 6, 10 → 확보 46 → (85 - 46) ÷ 30 × 100 = 130.0점, 불가
// 4) 총점이 100이 아니면 목표를 비율로 바꾼다: 중간 40, 과제 40, 기말 40 / 목표 85 → 120 × 85% = 102,
//    확보 60 → (102 - 60) ÷ 40 × 100 = 105.0점, 불가

export type GradingItem = { name: string; weight: number };
export type GradeStatus = "여유" | "주의" | "위험" | "불가";
export type GradeScores = Record<string, number>;

export const DEFAULT_TARGET = 85;

export type GradeRow = { name: string; weight: number; score: number | null };

export type GradeResult = {
  rows: GradeRow[]; // 기말 전 항목
  earned: number; // 기말 전까지 확보한 점수
  earnedMax: number; // 기말 전 항목 배점 합
  finalWeight: number; // 기말 배점
  total: number; // 모든 항목 배점 합
  targetPoints: number; // 총점 기준 목표 점수. 총점 100이면 목표 총점과 같다
  missing: number; // 아직 입력하지 않은 항목 수
  required: number | null; // 기말 100점 만점 기준 필요 점수, 소수 한 자리. 계산할 수 없으면 null
  requiredPoints: number; // 기말 배점 중 필요한 점수
  reached: boolean; // 기말 없이도 목표를 넘겼는지
  status: GradeStatus | null;
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function formatPoints(value: number) {
  return String(round1(value));
}

// "기말 과제"는 기말고사가 아니므로 이름 전체를 비교한다.
export function isFinalItem(name: string) {
  return /^기말(고사|시험)?$/.test(name.trim());
}

// 만점이 배점과 다른 점수를 배점 기준으로 바꾼다. 80점 / 100점 만점, 배점 30 → 24
export function convertScore(got: number, max: number, weight: number) {
  return Math.round((got / max) * weight * 100) / 100;
}

export function statusOf(required: number): GradeStatus {
  if (required > 100) return "불가";
  if (required >= 85) return "위험";
  if (required >= 70) return "주의";
  return "여유";
}

export function calcRequired(
  items: GradingItem[],
  scores: GradeScores,
  target: number,
): GradeResult {
  const rows: GradeRow[] = items
    .filter((item) => !isFinalItem(item.name))
    .map(({ name, weight }) => {
      const saved = Object.hasOwn(scores, name) ? scores[name] : null;
      // 배점을 나중에 줄였어도 배점보다 많이 확보한 것으로 세지 않는다.
      return { name, weight, score: saved === null ? null : Math.min(saved, weight) };
    });

  const finalWeight = items
    .filter((item) => isFinalItem(item.name))
    .reduce((sum, item) => sum + item.weight, 0);
  const earned = rows.reduce((sum, row) => sum + (row.score ?? 0), 0);
  const earnedMax = rows.reduce((sum, row) => sum + row.weight, 0);
  const missing = rows.filter((row) => row.score === null).length;
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  const targetPoints = (target * total) / 100;
  const summary = { rows, earned, earnedMax, finalWeight, total, targetPoints, missing };

  // 기말 배점이 없거나, 받은 점수를 하나도 넣지 않았으면 숫자를 내지 않는다.
  if (finalWeight <= 0 || (rows.length > 0 && missing === rows.length)) {
    return { ...summary, required: null, requiredPoints: 0, reached: false, status: null };
  }

  const left = targetPoints - earned;
  // 반올림한 값으로 상태를 정해야 화면의 숫자와 배지가 어긋나지 않는다.
  const required = Math.max(0, round1((left / finalWeight) * 100));
  return {
    ...summary,
    required,
    requiredPoints: round1(Math.max(0, left)),
    reached: left <= 0,
    status: statusOf(required),
  };
}
