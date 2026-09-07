import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

// 빌드 시점(환경변수가 아직 없을 수 있음)에는 생성하지 않고,
// 실제로 호출되는 시점에만 초기화한다.
function getAnthropic(): Anthropic {
  if (client) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY가 없습니다. web/.env.local에 발급받은 키를 설정하세요."
    );
  }

  client = new Anthropic({ apiKey });
  return client;
}

// 짧은 코치형 피드백 생성이라 비용이 저렴한 Haiku를 기본으로 사용.
// 근거 문장의 품질을 더 높이고 싶으면 "claude-sonnet-5"로 교체.
export const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

export type RiskInput = {
  productName: string;
  price: number;
  reason: string;
  hour: number;
  goalName?: string;
  goalAmount?: number;
};

export async function generateRiskFeedback(input: RiskInput) {
  const { productName, price, reason, hour, goalName, goalAmount } = input;

  const goalLine =
    goalName && goalAmount
      ? `사용자의 목표는 "${goalName}" (목표 금액 ${goalAmount.toLocaleString()}원)입니다.`
      : "사용자가 등록한 목표는 없습니다.";

  const message = await getAnthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 300,
    system:
      "당신은 대학생의 소비를 도와주는 PAUSEPAY의 AI 코치입니다. " +
      "사용자를 혼내거나 죄책감을 주지 말고, 담담하고 다정한 코치의 말투로 " +
      "구매를 한 번 더 생각해보게 만드는 짧은 한국어 피드백을 작성하세요. " +
      "2~3문장, 이모지 없이, 존댓말로 작성합니다.",
    messages: [
      {
        role: "user",
        content:
          `상품: ${productName} (${price.toLocaleString()}원)\n` +
          `구매 이유: ${reason}\n` +
          `현재 시각: ${hour}시\n` +
          `${goalLine}\n` +
          "위 정보를 바탕으로 충동구매 위험도에 대한 근거와 피드백을 작성해주세요.",
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock && "text" in textBlock ? textBlock.text : "";
}
