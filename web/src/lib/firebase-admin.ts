// 서버 전용. 클라이언트 파일에서 가져오지 않는다.
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export class AccountApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function getAdminApp() {
  const existing = getApps().find((app) => app.name === "unis-server");
  if (existing) return existing;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new AccountApiError(503, "계정별 AI 사용량 연결을 준비 중이에요. 잠시 뒤에 다시 해 주세요.");
  }
  if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && projectId !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new AccountApiError(503, "계정별 AI 사용량 설정을 확인 중이에요. 잠시 뒤에 다시 해 주세요.");
  }
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) }, "unis-server");
}
export const getAdminDb = () => getFirestore(getAdminApp());

// uid는 화면 입력이 아닌 Firebase가 검증한 ID 토큰에서만 얻는다.
export async function verifiedUid(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization");
  if (header === null) return null;
  if (!/^Bearer \S+$/.test(header) || header.length > 8192) {
    throw new AccountApiError(401, "로그인을 다시 확인해 주세요.");
  }
  const auth = getAuth(getAdminApp());
  try {
    const token = await auth.verifyIdToken(header.slice(7), true);
    if (!token.uid || token.uid.includes("/")) throw new Error("invalid uid");
    return token.uid;
  } catch {
    throw new AccountApiError(401, "로그인 확인이 만료됐어요. 다시 로그인해 주세요.");
  }
}
