import { NextResponse, type NextRequest } from "next/server";
import { mockPurchase, walletSummary } from "@/lib/cookie-store";
import { AccountApiError, getAdminDb, verifiedUid } from "@/lib/firebase-admin";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

function errorResponse(error: unknown, fallback: string) {
  return NextResponse.json(
    { error: error instanceof AccountApiError ? error.message : fallback },
    { status: error instanceof AccountApiError ? error.status : 503, headers: PRIVATE_HEADERS },
  );
}

async function requireUid(request: NextRequest) {
  const uid = await verifiedUid(request);
  if (!uid) throw new AccountApiError(401, "로그인하면 쿠키를 쓸 수 있어요.");
  return uid;
}

export async function GET(request: NextRequest) {
  try {
    const uid = await requireUid(request);
    return NextResponse.json(await walletSummary(await getAdminDb(), uid), { headers: PRIVATE_HEADERS });
  } catch (error) {
    return errorResponse(error, "쿠키를 불러오지 못했어요. 잠시 뒤에 다시 해 주세요.");
  }
}

// 모의 결제. 돈을 받지 않는다. 상품 값은 서버의 표에서 다시 찾는다.
export async function POST(request: NextRequest) {
  try {
    const uid = await requireUid(request);
    const body: unknown = await request.json().catch(() => null);
    const packId = body && typeof body === "object" ? (body as Record<string, unknown>).pack : null;
    return NextResponse.json(await mockPurchase(await getAdminDb(), uid, packId), { headers: PRIVATE_HEADERS });
  } catch (error) {
    return errorResponse(error, "쿠키를 넣지 못했어요. 잠시 뒤에 다시 해 주세요.");
  }
}
