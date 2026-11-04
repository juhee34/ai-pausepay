import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { calendarTokenFromPath, readSubscriptionCalendar, subscriptionHeaders } from "@/lib/calendar-subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const token = calendarTokenFromPath((await context.params).token);
  const notFound = () => new NextResponse("구독 주소를 찾을 수 없어요.", { status: 404, headers: subscriptionHeaders });
  if (!token) return notFound();
  try {
    const calendar = await readSubscriptionCalendar(await getAdminDb(), token);
    if (calendar === null) return notFound();
    return new NextResponse(calendar, { headers: {
      ...subscriptionHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="unis-schedule.ics"',
      "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    // 주소·일정·토큰과 원래 오류는 로그에 남기지 않는다.
    return new NextResponse("구독 일정을 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.", { status: 503, headers: subscriptionHeaders });
  }
}
