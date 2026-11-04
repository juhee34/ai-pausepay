import { NextResponse } from "next/server";
import { z } from "zod";
import { AccountApiError, getAdminDb, verifiedUid } from "@/lib/firebase-admin";
import { hasCalendarSubscription, issueCalendarSubscription, subscriptionHeaders } from "@/lib/calendar-subscription";

export const runtime = "nodejs";
const ActionSchema = z.object({ action: z.enum(["create", "rotate"]) }).strict();
function errorResponse(error: unknown) {
  const status = error instanceof AccountApiError ? error.status : 503;
  const message = error instanceof AccountApiError && status < 500
    ? error.message : "캘린더 구독 연결을 준비 중이거나 응답이 없어요. 잠시 뒤에 다시 해 주세요.";
  return NextResponse.json({ error: message }, { status, headers: subscriptionHeaders });
}
async function requireUid(request: Request) {
  const uid = await verifiedUid(request);
  if (!uid) throw new AccountApiError(401, "로그인하면 캘린더 구독 주소를 만들 수 있어요.");
  return uid;
}
export async function GET(request: Request) {
  try {
    const uid = await requireUid(request);
    return NextResponse.json({ active: await hasCalendarSubscription(await getAdminDb(), uid) }, { headers: subscriptionHeaders });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const uid = await requireUid(request);
    // 외부 uid·토큰을 받지 않는다. 로그인으로 검증한 본인의 주소만 바꾼다.
    if (Number(request.headers.get("content-length")) > 1024) {
      throw new AccountApiError(413, "요청이 너무 커요.");
    }
    const body = await request.text();
    if (body.length > 1024) throw new AccountApiError(413, "요청이 너무 커요.");
    const parsed = ActionSchema.safeParse((() => { try { return JSON.parse(body); } catch { return null; } })());
    if (!parsed.success) throw new AccountApiError(400, "주소 만들기 요청을 확인해 주세요.");
    const path = await issueCalendarSubscription(await getAdminDb(), uid, parsed.data.action);
    return NextResponse.json({ path }, { headers: subscriptionHeaders });
  } catch (error) { return errorResponse(error); }
}
