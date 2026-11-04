import { NextResponse, type NextRequest } from "next/server";
import { AccountApiError, getAdminDb, verifiedUid } from "@/lib/firebase-admin";
import { usageSummary } from "@/lib/ai-usage-store";

export async function GET(request: NextRequest) {
  try {
    const uid = await verifiedUid(request);
    if (!uid) throw new AccountApiError(401, "로그인하면 계정별 사용량을 볼 수 있어요.");
    return NextResponse.json(await usageSummary(await getAdminDb(), uid), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof AccountApiError ? error.message : "사용량을 불러오지 못했어요. 잠시 뒤에 다시 해 주세요." }, { status: error instanceof AccountApiError ? error.status : 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
