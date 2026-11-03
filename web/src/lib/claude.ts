import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

// 빌드 시점(환경변수가 아직 없을 수 있음)에는 생성하지 않고,
// 실제로 호출되는 시점에만 초기화한다.
export function getAnthropic(): Anthropic {
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
