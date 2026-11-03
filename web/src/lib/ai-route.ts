import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { AI_LIMIT_MESSAGE, DAILY_AI_LIMIT, getAiUsageToday } from "./ai-limit";

// AI를 부르는 서버 코드(app/api/*/route.ts)가 같이 쓰는 도우미.
// 하루 사용 횟수 확인과 Claude 오류 처리를 한곳에 모아, 나중에 사용자별 사용량을 붙일 때 여기만 고치면 되게 한다.

// 서버는 maxDuration(60초)에 끊긴다. 한 번에 25초, 실패하면 1번만 다시 시도해서 그 안에 안내 문구를 돌려준다.
// (시험 대비 팩은 자기 시간 계산이 있어서 이 값을 쓰지 않는다.)
export const CLAUDE_REQUEST_OPTIONS = { timeout: 25_000, maxRetries: 1 };

// 오늘 횟수를 다 썼으면 안내 응답을, 아니면 오늘 쓴 횟수를 돌려준다.
export function checkAiLimit(request: NextRequest): { usedToday: number } | NextResponse {
  const usedToday = getAiUsageToday(request);
  if (usedToday >= DAILY_AI_LIMIT) {
    return NextResponse.json({ error: AI_LIMIT_MESSAGE }, { status: 429 });
  }
  return { usedToday };
}

// Claude 호출 중 생긴 오류를 사용자에게 보여 줄 안내로 바꾼다. 우리 코드의 버그는 그대로 던진다.
// 로그에는 오류 종류만 남기고, 사용자 자료나 AI 답 내용은 남기지 않는다.
export function claudeErrorResponse(error: unknown, route: string) {
  if (error instanceof Anthropic.RateLimitError) {
    return NextResponse.json(
      { error: "지금 요청이 많아요. 잠시 뒤에 다시 해 주세요." },
      { status: 429 },
    );
  }
  if (error instanceof Anthropic.APIError) {
    // 시간 초과(APIConnectionTimeoutError)도 여기로 온다.
    console.error(`${route}: Claude API error`, error.status, error.message);
    return NextResponse.json(
      { error: "AI가 응답하지 않았어요. 잠시 뒤에 다시 해 주세요." },
      { status: 502 },
    );
  }
  if (error instanceof Anthropic.AnthropicError) {
    // AI 답이 정해진 형식에 맞지 않아 읽지 못한 경우
    console.error(`${route}: could not read Claude answer`);
    return NextResponse.json(
      { error: "AI 답을 읽지 못했어요. 다시 해 주세요." },
      { status: 502 },
    );
  }
  throw error;
}

// 파일을 올리는 요청(multipart)이 아니면 null. 이상한 요청에도 서버 오류(500) 대신 안내를 돌려주기 위해.
export async function readFormFile(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  return file instanceof File ? file : null;
}
