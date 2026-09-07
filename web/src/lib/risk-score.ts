export type ReasonTag =
  | "진짜_필요해서"
  | "스트레스_받아서"
  | "할인_중이라서"
  | "보상받고_싶어서"
  | "그냥_갖고_싶어서";

export type RiskScoreInput = {
  price: number;
  reason: ReasonTag;
  hour: number; // 0-23, 등록 시각
  isRepeatPurchase: boolean; // 최근 유사 소비 반복 여부
  conflictsWithGoal: boolean; // 목표 금액과 충돌하는지
};

export type CooldownLevel = "없음" | "24시간" | "3일" | "7일";

export type RiskScoreResult = {
  score: number; // 0-100
  cooldown: CooldownLevel;
  reasons: string[];
};

const REASON_WEIGHT: Record<ReasonTag, number> = {
  진짜_필요해서: 0,
  스트레스_받아서: 25,
  할인_중이라서: 15,
  보상받고_싶어서: 20,
  그냥_갖고_싶어서: 20,
};

/**
 * 새벽(0~5시) 시간대, 고가 소비, 반복 소비, 목표 충돌, 구매 이유를
 * 가중치로 합산하는 규칙 기반 위험도 점수. 0~100 범위로 클램프한다.
 */
export function calculateRiskScore(input: RiskScoreInput): RiskScoreResult {
  const { price, reason, hour, isRepeatPurchase, conflictsWithGoal } = input;
  const reasons: string[] = [];
  let score = 0;

  if (hour >= 0 && hour < 6) {
    score += 25;
    reasons.push("새벽 시간대(0~6시) 구매 시도");
  }

  if (price >= 100000) {
    score += 25;
    reasons.push("10만원 이상 고가 소비");
  } else if (price >= 50000) {
    score += 12;
    reasons.push("5만원 이상 중가 소비");
  }

  const reasonWeight = REASON_WEIGHT[reason];
  if (reasonWeight > 0) {
    score += reasonWeight;
    reasons.push(`구매 이유(${reason.replace(/_/g, " ")})가 충동구매 신호로 확인됨`);
  }

  if (isRepeatPurchase) {
    score += 15;
    reasons.push("최근 반복된 유사 소비 패턴");
  }

  if (conflictsWithGoal) {
    score += 15;
    reasons.push("등록된 목표 금액과 충돌");
  }

  score = Math.min(100, Math.max(0, score));

  let cooldown: CooldownLevel = "없음";
  if (score >= 70) cooldown = "7일";
  else if (score >= 45) cooldown = "3일";
  else if (score >= 25) cooldown = "24시간";

  return { score, cooldown, reasons };
}
