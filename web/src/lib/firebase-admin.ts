// 서버 전용. 클라이언트 파일에서 가져오지 않는다.
// firebase-admin은 쓸 때만 불러온다. 로그인하지 않은 AI 요청은 이 패키지 없이 동작해야 한다.

export class AccountApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
async function loadAdminApp() {
  try {
    return await import("firebase-admin/app");
  } catch {
    throw new AccountApiError(503, "계정별 AI 사용량 연결을 준비 중이에요. 잠시 뒤에 다시 해 주세요.");
  }
}

export async function getAdminApp() {
  const { cert, getApps, initializeApp } = await loadAdminApp();
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
export async function getAdminDb() {
  const app = await getAdminApp();
  const { getFirestore } = await import("firebase-admin/firestore");
  return getFirestore(app);
}

// uid는 화면 입력이 아닌 Firebase가 검증한 ID 토큰에서만 얻는다.
export async function verifiedUid(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization");
  if (header === null) return null;
  if (!/^Bearer \S+$/.test(header) || header.length > 8192) {
    throw new AccountApiError(401, "로그인을 다시 확인해 주세요.");
  }
  const app = await getAdminApp();
  const { getAuth } = await import("firebase-admin/auth");
  const auth = getAuth(app);
  try {
    const token = await auth.verifyIdToken(header.slice(7), true);
    if (!token.uid || token.uid.includes("/")) throw new Error("invalid uid");
    return token.uid;
  } catch {
    throw new AccountApiError(401, "로그인 확인이 만료됐어요. 다시 로그인해 주세요.");
  }
}
