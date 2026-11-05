import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

// 기기당 하루 무료 쿠키(AI 사용 횟수). 자동 브리핑만 따로 센다 (ai-usage.ts).
export { BRIEFING_DAILY_LIMIT, DAILY_AI_LIMIT } from "./ai-usage";
import { DAILY_AI_LIMIT } from "./ai-usage";
export const AI_LIMIT_MESSAGE = `오늘 무료 쿠키 ${DAILY_AI_LIMIT}개를 모두 썼어요. 내일 다시 쓰거나, 마이페이지에서 로그인하고 쿠키를 충전해 주세요.`;
export const BRIEFING_LIMIT_MESSAGE = "오늘 브리핑을 모두 받았어요. 내일 다시 받아요.";

// counter: 무료 쿠키(ai)와 자동 브리핑(briefing)을 다른 쿠키 이름으로 센다.
export type AiCounter = "ai" | "briefing";
const COOKIE_NAMES: Record<AiCounter, string> = { ai: "unis_ai_usage", briefing: "unis_ai_briefing" };
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 2;

function getSecret() {
  const secret = process.env.AI_LIMIT_SECRET;
  if (!secret) {
    throw new Error(
      "AI_LIMIT_SECRET이 없습니다. web/.env.local과 Vercel 환경 변수에 설정하세요.",
    );
  }
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function isSignatureValid(payload: string, signature: string) {
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function todayInSeoul() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

// 쿠키가 없거나, 고쳐졌거나, 어제 것이면 0회로 본다.
// 쿠키를 지우면 횟수도 지워지므로, 비용의 마지막 안전장치는 콘솔의 월 사용 한도다.
export function getAiUsageToday(request: NextRequest, counter: AiCounter = "ai") {
  getSecret();

  const [date, count, signature] = (
    request.cookies.get(COOKIE_NAMES[counter])?.value ?? ""
  ).split(".");
  if (!date || !count || !signature) return 0;
  if (date !== todayInSeoul()) return 0;
  if (!isSignatureValid(`${date}.${count}`, signature)) return 0;

  const used = Number(count);
  return Number.isInteger(used) && used >= 0 ? used : 0;
}

export function recordAiUse(response: NextResponse, usedToday: number, counter: AiCounter = "ai") {
  // 두 쿠키는 같은 모양이라 서로 바꿔 넣을 수 있지만, 쿠키를 지우는 것과 같은 정도라(위 주석) 따로 막지 않는다.
  const payload = `${todayInSeoul()}.${usedToday + 1}`;
  response.cookies.set(COOKIE_NAMES[counter], `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}
