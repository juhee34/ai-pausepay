// 기말 필요 점수 계산. 화면 코드 없이 함수만 둔다. AI는 쓰지 않는다.
//
// 확인용 예시 (평가 항목: 중간 30, 과제 20, 퀴즈 10, 출석 10, 기말 30 / 목표 85)
// 1) 받은 점수 24, 18, 8, 10 → 확보 60 → (85 - 60) ÷ 30 × 100 = 83.3점, 주의
// 2) 받은 점수 26, 18, 10, 10 → 확보 64 → (85 - 64) ÷ 30 × 100 = 70.0점, 주의
// 3) 받은 점수 18, 12, 6, 10 → 확보 46 → (85 - 46) ÷ 30 × 100 = 130.0점, 목표 초과
// 4) 총점이 100이 아니면 목표를 비율로 바꾼다: 중간 40, 과제 40, 기말 40 / 목표 85 → 120 × 85% = 102,
//    확보 60 → (102 - 60) ÷ 40 × 100 = 105.0점, 목표 초과

export type GradingItem = { name: string; weight: number };
export type GradeStatus = "여유" | "주의" | "위험" | "목표 초과";
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
  maxTotal: number; // 기말을 100점 받았을 때의 총점 (100점 기준, 소수 한 자리)
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
  if (required > 100) return "목표 초과";
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
  const maxTotal = total > 0 ? round1(((earned + finalWeight) / total) * 100) : 0;
  const summary = { rows, earned, earnedMax, finalWeight, total, targetPoints, maxTotal, missing };

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

// ---- 상대평가 컷 추정 ----
// 교수님이 알려 주는 평균과 내 점수로 학점별 컷을 어림잡는다. 실제 컷이 아니라 추정이다.
//
// 확인용 예시 (중간 30, 과제 10, 퀴즈 20, 출석 10, 기말 30 / 내 점수 24, 10, 20, 10 / 중간 평균 18)
// 평균 비율 18 ÷ 30 = 60%. 평균을 모르는 항목은 내 점수로 본다. 기말 평균 30 × 60% = 18.
// 전체 평균 18 + 10 + 20 + 10 + 18 = 76점. 퍼진 정도 10점, A+ 상위 15%(z 1.036) → 컷 86.4점
// 기말 필요 점수 (86.4 - 64) ÷ 30 × 100 = 74.7점

export const GRADE_LEVELS = ["A+", "A0", "B+", "B0"] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];
export const DEFAULT_GRADE: GradeLevel = "A0";

// spread: 총점 100점 기준 표준편차. shares: 그 학점 이상이 전체의 몇 %인지.
// 임시 기본값이다. 광운대 실제 학점 비율을 확인한 값이 아니라 사용자가 고칠 수 있게 한다.
export type GradeEstimate = { spread: number; shares: Record<GradeLevel, number> };
export const DEFAULT_ESTIMATE: GradeEstimate = {
  spread: 10,
  shares: { "A+": 15, A0: 30, "B+": 50, B0: 70 },
};

export type GradeCut = { grade: GradeLevel; cut: number; result: GradeResult };
export type CutEstimate = {
  classMean: number; // 추정한 전체 평균 (100점 기준)
  averageRate: number; // 입력한 평균의 비율 (0~1). 기말 평균도 이 비율로 본다.
  assumedItems: string[]; // 평균을 몰라 내 점수로 본 항목
  spread: number; // 계산에 쓴 퍼진 정도 (100점 기준)
  measuredSpread: boolean; // 점수표의 표준편차로 구했는지
  cuts: GradeCut[];
};

// 표준 정규 분포에서 위쪽 share% 지점의 z 값 (Abramowitz & Stegun 26.2.23)
export function upperZ(sharePercent: number) {
  const p = sharePercent / 100;
  if (p === 0.5) return 0;
  const tail = p < 0.5 ? p : 1 - p;
  const t = Math.sqrt(-2 * Math.log(tail));
  const z = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
  return p < 0.5 ? z : -z;
}

// 항목별 표준편차(배점 기준)를 총점 100점 기준 퍼진 정도로 바꾼다.
// 점수가 고르게 나오는 시험과 기말이 함께 퍼진다고 보고, 표준편차를 모르는 출석·과제 등은 0으로 본다.
// 예: 중간 30점에 표준편차 6(20%), 기말 60점도 20%로 본다. (6 + 12) ÷ 총점 100 × 100 = 18
export function spreadFromItems(items: GradingItem[], spreads: GradeScores) {
  const known = items.filter((item) => !isFinalItem(item.name) && Object.hasOwn(spreads, item.name));
  const finalWeight = items.filter((item) => isFinalItem(item.name)).reduce((sum, item) => sum + item.weight, 0);
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  const knownWeight = known.reduce((sum, item) => sum + item.weight, 0);
  const knownSpread = known.reduce((sum, item) => sum + Math.min(spreads[item.name], item.weight), 0);
  if (knownSpread <= 0 || knownWeight <= 0 || finalWeight <= 0 || total <= 0) return null;
  return round1(((knownSpread + finalWeight * (knownSpread / knownWeight)) / total) * 100);
}

// 평균을 하나도 안 넣었거나 기말 배점이 없으면 null.
export function estimateCuts(
  items: GradingItem[],
  scores: GradeScores,
  averages: GradeScores,
  estimate: GradeEstimate = DEFAULT_ESTIMATE,
  spreads: GradeScores = {},
): CutEstimate | null {
  const rows = items.filter((item) => !isFinalItem(item.name));
  const finalWeight = items.filter((item) => isFinalItem(item.name)).reduce((sum, item) => sum + item.weight, 0);
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  const known = rows.filter((row) => Object.hasOwn(averages, row.name));
  if (finalWeight <= 0 || known.length === 0) return null;

  const knownWeight = known.reduce((sum, row) => sum + row.weight, 0);
  const knownAverage = known.reduce((sum, row) => sum + Math.min(averages[row.name], row.weight), 0);
  const averageRate = knownWeight > 0 ? knownAverage / knownWeight : 0;

  const assumedItems: string[] = [];
  let points = finalWeight * averageRate;
  for (const row of rows) {
    if (Object.hasOwn(averages, row.name)) {
      points += Math.min(averages[row.name], row.weight);
    } else if (Object.hasOwn(scores, row.name)) {
      assumedItems.push(row.name);
      points += Math.min(scores[row.name], row.weight);
    } else {
      // 내 점수도 모르면 입력한 평균의 비율로 본다.
      assumedItems.push(row.name);
      points += row.weight * averageRate;
    }
  }
  const classMean = (points / total) * 100;

  const measured = spreadFromItems(items, spreads);
  const spread = measured ?? estimate.spread;
  const cuts = GRADE_LEVELS.map((grade) => {
    const raw = classMean + upperZ(estimate.shares[grade]) * spread;
    const cut = Math.min(100, Math.max(0, round1(raw)));
    return { grade, cut, result: calcRequired(items, scores, cut) };
  });
  return { classMean: round1(classMean), averageRate, assumedItems, spread, measuredSpread: measured !== null, cuts };
}
