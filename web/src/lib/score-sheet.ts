// 점수표에서 읽은 숫자를 확인하고 평균·표준편차·내 등수를 계산한다. 화면 코드 없이 함수만 둔다. AI를 쓰지 않는다.
//
// 확인용 예시: 만점 30, 전체 점수 10, 20, 30 → 평균 20, 표준편차 8.16(모집단 기준)
// 내 점수 20이면 나보다 높은 사람 1명 → 3명 중 2등, 상위 66.7%
// 전체 점수 목록은 계산에만 쓰고 저장하지 않는다.

export const MAX_SCORE_LIST = 500;
export const MIN_SCORES_FOR_STATS = 2;

export type ScoreSheetInput = {
  maxScore: string;
  myScore: string;
  average: string;
  stdDev: string;
  scoreList: string;
};

export type ScoreSheetValues = {
  maxScore: number;
  myScore: number | null;
  average: number;
  stdDev: number | null;
  count: number; // 전체 점수 개수. 목록이 없으면 0
  rank: number | null;
  topPercent: number | null;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

// 쉼표, 공백, 줄바꿈으로 나눈다. 숫자가 아닌 조각은 따로 돌려준다.
export function parseScoreList(text: string) {
  const scores: number[] = [];
  const invalid: string[] = [];
  for (const piece of text.split(/[\s,;]+/).filter(Boolean)) {
    const value = Number(piece);
    if (Number.isFinite(value) && value >= 0) scores.push(value);
    else invalid.push(piece);
  }
  return { scores, invalid };
}

// 반 전체의 점수이므로 모집단 표준편차를 쓴다.
export function scoreStats(scores: number[]) {
  const count = scores.length;
  if (count === 0) return { count: 0, mean: 0, stdDev: 0 };
  const mean = scores.reduce((sum, n) => sum + n, 0) / count;
  const variance = scores.reduce((sum, n) => sum + (n - mean) ** 2, 0) / count;
  return { count, mean: round2(mean), stdDev: round2(Math.sqrt(variance)) };
}

// 같은 점수는 같은 등수다. 나보다 높은 사람 수 + 1.
export function rankOf(myScore: number, scores: number[]) {
  const count = scores.length;
  const rank = scores.filter((n) => n > myScore).length + 1;
  return { rank, count, topPercent: Math.round((rank / Math.max(count, 1)) * 1000) / 10 };
}

// 칸에 쓴 값이 먼저이고, 비어 있으면 전체 점수로 계산한다.
export function resolveScoreSheet(input: ScoreSheetInput): { values: ScoreSheetValues | null; error: string | null } {
  const fail = (error: string) => ({ values: null, error });
  const number = (text: string) => (text.trim() === "" ? null : Number(text));

  const maxScore = number(input.maxScore);
  if (maxScore === null || !Number.isFinite(maxScore) || maxScore <= 0) {
    return fail("만점을 0보다 큰 숫자로 넣어 주세요.");
  }

  const { scores, invalid } = parseScoreList(input.scoreList);
  if (invalid.length > 0) return fail(`전체 점수에 숫자가 아닌 값이 있어요: ${invalid.slice(0, 3).join(", ")}`);
  if (scores.length > MAX_SCORE_LIST) return fail(`전체 점수는 ${MAX_SCORE_LIST}개까지 넣을 수 있어요.`);
  if (scores.length === 1) return fail(`전체 점수는 ${MIN_SCORES_FOR_STATS}개 이상 넣어 주세요.`);
  const over = scores.filter((n) => n > maxScore).length;
  if (over > 0) return fail(`전체 점수 중 ${over}개가 만점보다 커요. 만점이나 점수를 확인해 주세요.`);
  const stats = scores.length >= MIN_SCORES_FOR_STATS ? scoreStats(scores) : null;

  const myScore = number(input.myScore);
  if (myScore !== null && (!Number.isFinite(myScore) || myScore < 0 || myScore > maxScore)) {
    return fail("내 점수는 0부터 만점 사이 숫자로 넣어 주세요.");
  }
  const typedAverage = number(input.average);
  if (typedAverage !== null && (!Number.isFinite(typedAverage) || typedAverage < 0 || typedAverage > maxScore)) {
    return fail("평균은 0부터 만점 사이 숫자로 넣어 주세요.");
  }
  const average = typedAverage ?? stats?.mean ?? null;
  if (average === null) return fail("평균이나 전체 점수를 넣어 주세요.");
  const typedStdDev = number(input.stdDev);
  if (typedStdDev !== null && (!Number.isFinite(typedStdDev) || typedStdDev < 0 || typedStdDev > maxScore)) {
    return fail("표준편차는 0부터 만점 사이 숫자로 넣어 주세요.");
  }

  const ranked = myScore !== null && stats ? rankOf(myScore, scores) : null;
  return {
    values: {
      maxScore,
      myScore,
      average,
      stdDev: typedStdDev ?? stats?.stdDev ?? null,
      count: scores.length,
      rank: ranked?.rank ?? null,
      topPercent: ranked?.topPercent ?? null,
    },
    error: null,
  };
}
