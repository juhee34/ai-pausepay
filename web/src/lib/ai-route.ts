import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { AI_LIMIT_MESSAGE, DAILY_AI_LIMIT, getAiUsageToday, recordAiUse } from "./ai-limit";
import { AccountApiError, getAdminDb, verifiedUid } from "./firebase-admin";
import { reserveUsage, settleUsage } from "./ai-usage-store";
import type { AiFeature } from "./ai-usage";
import { logAccountError } from "./account-diagnostics";

type UsageContext = { feature: AiFeature; usedToday?: number; lease?: Awaited<ReturnType<typeof reserveUsage>>; settled?: boolean };
const contexts = new WeakMap<NextRequest, UsageContext>();

function usageError(error: unknown) {
  if (!(error instanceof AccountApiError)) logAccountError("ai-usage", error);
  return NextResponse.json({ error: error instanceof AccountApiError ? error.message : "계정별 사용량을 확인하지 못했어요. 잠시 뒤에 다시 해 주세요." }, { status: error instanceof AccountApiError ? error.status : 503 });
}

// 오류 응답·예외에서는 예약을 돌려준다. 서버가 강제 종료되면 예약은 2분 뒤 만료된다.
export function withAiUsage(feature: AiFeature, handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const context: UsageContext = { feature };
    contexts.set(request, context);
    try {
      return await handler(request);
    } finally {
      if (context.lease && !context.settled) {
        try { await settleUsage(await getAdminDb(), context.lease, false); }
        catch { console.error("usage: reservation release failed"); }
      }
      contexts.delete(request);
    }
  };
}

export async function completeAiUse(response: NextResponse, request: NextRequest) {
  const context = contexts.get(request);
  if (!context) throw new Error("AI usage context missing");
  if (context.lease) {
    try {
      await settleUsage(await getAdminDb(), context.lease, true);
      context.settled = true;
    } catch (error) {
      // 쓰기 결과가 불명확하면 실패 취소로 덮지 않는다. 미확정 예약은 만료된다.
      context.settled = true;
      await response.body?.cancel().catch(() => {});
      return usageError(error);
    }
  } else {
    recordAiUse(response, context.usedToday ?? 0);
  }
  return response;
}

// AI를 부르는 서버 코드(app/api/*/route.ts)가 같이 쓰는 도우미.
// 로그인 계정은 Firestore 트랜잭션, 비로그인은 기존 서명 쿠키로 제한한다.

// 서버는 maxDuration(60초)에 끊긴다. 한 번에 25초, 실패하면 1번만 다시 시도해서 그 안에 안내 문구를 돌려준다.
// (시험 대비 팩은 자기 시간 계산이 있어서 이 값을 쓰지 않는다.)
export const CLAUDE_REQUEST_OPTIONS = { timeout: 25_000, maxRetries: 1 };

// 오늘 횟수를 다 썼으면 안내 응답을, 아니면 오늘 쓴 횟수를 돌려준다.
export async function checkAiLimit(request: NextRequest): Promise<{ usedToday: number } | NextResponse> {
  const context = contexts.get(request);
  if (!context) throw new Error("AI usage context missing");
  try {
    const uid = await verifiedUid(request);
    if (uid) {
      context.lease = await reserveUsage(await getAdminDb(), uid, context.feature);
      return { usedToday: 0 };
    }
  } catch (error) { return usageError(error); }
  const usedToday = getAiUsageToday(request);
  if (usedToday >= DAILY_AI_LIMIT) {
    return NextResponse.json({ error: AI_LIMIT_MESSAGE }, { status: 429 });
  }
  context.usedToday = usedToday;
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
