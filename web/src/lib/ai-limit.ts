import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

// 기기당 하루 AI 사용 횟수. 모든 AI 기능이 함께 쓴다.
export const DAILY_AI_LIMIT = 20;
export const AI_LIMIT_MESSAGE = `오늘 AI를 ${DAILY_AI_LIMIT}번 모두 썼어요. 내일 다시 써 주세요.`;

const COOKIE_NAME = "unis_ai_usage";
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
export function getAiUsageToday(request: NextRequest) {
  getSecret();

  const [date, count, signature] = (
    request.cookies.get(COOKIE_NAME)?.value ?? ""
  ).split(".");
  if (!date || !count || !signature) return 0;
  if (date !== todayInSeoul()) return 0;
  if (!isSignatureValid(`${date}.${count}`, signature)) return 0;

  const used = Number(count);
  return Number.isInteger(used) && used >= 0 ? used : 0;
}

export function recordAiUse(response: NextResponse, usedToday: number) {
  const payload = `${todayInSeoul()}.${usedToday + 1}`;
  response.cookies.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}
