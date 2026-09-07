import { NextResponse } from "next/server";
import { calculateRiskScore, type ReasonTag } from "@/lib/risk-score";
import { generateRiskFeedback } from "@/lib/claude";

type RiskScoreRequestBody = {
  productName: string;
  price: number;
  reason: ReasonTag;
  hour: number;
  isRepeatPurchase?: boolean;
  conflictsWithGoal?: boolean;
  goalName?: string;
  goalAmount?: number;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<RiskScoreRequestBody>;

  if (!body.productName || !body.price || !body.reason || body.hour === undefined) {
    return NextResponse.json(
      { error: "productName, price, reason, hour는 필수입니다." },
      { status: 400 }
    );
  }

  const { score, cooldown, reasons } = calculateRiskScore({
    price: body.price,
    reason: body.reason,
    hour: body.hour,
    isRepeatPurchase: body.isRepeatPurchase ?? false,
    conflictsWithGoal: body.conflictsWithGoal ?? false,
  });

  const feedback = await generateRiskFeedback({
    productName: body.productName,
    price: body.price,
    reason: body.reason,
    hour: body.hour,
    goalName: body.goalName,
    goalAmount: body.goalAmount,
  });

  return NextResponse.json({ score, cooldown, reasons, feedback });
}
