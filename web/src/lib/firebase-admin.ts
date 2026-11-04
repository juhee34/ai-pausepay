// 서버 전용. 클라이언트 파일에서 가져오지 않는다.
// firebase-admin은 쓸 때만 불러온다. 로그인하지 않은 AI 요청은 이 패키지 없이 동작해야 한다.
import { logAccountError } from "./account-diagnostics";

export class AccountApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
async function loadAdminApp() {
  try {
    return await import("firebase-admin/app");
  } catch (error) {
    if (!(error instanceof AccountApiError)) logAccountError("load-app", error);
    throw new AccountApiError(503, "계정별 AI 사용량 연결을 준비 중이에요. 잠시 뒤에 다시 해 주세요.");
  }
}

// Vercel에 값을 붙여 넣을 때 앞뒤 따옴표·공백·쉼표가 같이 들어가기 쉽다. 그런 것만 걷어 낸다.
export function cleanEnvValue(raw: string | undefined) {
  const value = raw?.trim().replace(/,$/, "").trim().replace(/^"([\s\S]*)"$/, "$1").trim();
  return value || undefined;
}

// 비밀 키에서 BEGIN~END 부분만 꺼낸다. JSON의 "private_key": "…" 줄을 통째로 넣어도,
// 줄바꿈이 \n 글자로 들어가도, 윈도 줄바꿈(\r\n)이어도 읽는다. 키가 없으면 undefined.
export function normalizePrivateKey(raw: string | undefined) {
  const text = raw?.replace(/\\r/g, "").replace(/\\n/g, "\n").replace(/\r/g, "");
  const match = text?.match(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/);
  return match ? `${match[0]}\n` : cleanEnvValue(text);
}

async function initializeAdminApp() {
  const { cert, getApps, initializeApp } = await loadAdminApp();
  const existing = getApps().find((app) => app.name === "unis-server");
  if (existing) return existing;
  const projectId = cleanEnvValue(process.env.FIREBASE_ADMIN_PROJECT_ID);
  const clientEmail = cleanEnvValue(process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);
  if (!projectId || !clientEmail || !privateKey) {
    throw new AccountApiError(503, "계정별 AI 사용량 연결을 준비 중이에요. 잠시 뒤에 다시 해 주세요.");
  }
  const publicProjectId = cleanEnvValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  if (publicProjectId && projectId !== publicProjectId) {
    throw new AccountApiError(503, "계정별 AI 사용량 설정을 확인 중이에요. 잠시 뒤에 다시 해 주세요.");
  }
  try {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) }, "unis-server");
  } catch (error) {
    if (!(error instanceof AccountApiError)) logAccountError("initialize-app", error);
    throw new AccountApiError(503, "계정 연결 설정을 확인 중이에요. 로그아웃하면 지금도 AI 기능을 쓸 수 있어요.");
  }
}
export async function getAdminApp() {
  try {
    return await initializeAdminApp();
  } catch (error) {
    if (!(error instanceof AccountApiError)) logAccountError("get-admin-app", error);
    throw error;
  }
}
export async function getAdminDb() {
  const app = await getAdminApp();
  let firestore: typeof import("firebase-admin/firestore");
  try {
    firestore = await import("firebase-admin/firestore");
  } catch (error) {
    if (!(error instanceof AccountApiError)) logAccountError("load-firestore", error);
    throw error;
  }
  try {
    return firestore.getFirestore(app);
  } catch (error) {
    if (!(error instanceof AccountApiError)) logAccountError("initialize-firestore", error);
    throw error;
  }
}

// uid는 화면 입력이 아닌 Firebase가 검증한 ID 토큰에서만 얻는다.
export async function verifiedUid(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization");
  if (header === null) return null;
  if (!/^Bearer \S+$/.test(header) || header.length > 8192) {
    throw new AccountApiError(401, "로그인을 다시 확인해 주세요.");
  }
  const app = await getAdminApp();
  let authModule: typeof import("firebase-admin/auth");
  try {
    authModule = await import("firebase-admin/auth");
  } catch (error) {
    if (!(error instanceof AccountApiError)) logAccountError("load-auth", error);
    throw error;
  }
  let auth: ReturnType<typeof authModule.getAuth>;
  try {
    auth = authModule.getAuth(app);
  } catch (error) {
    if (!(error instanceof AccountApiError)) logAccountError("initialize-auth", error);
    throw error;
  }
  try {
    const token = await auth.verifyIdToken(header.slice(7), true);
    if (!token.uid || token.uid.includes("/")) throw new Error("invalid uid");
    return token.uid;
  } catch {
    throw new AccountApiError(401, "로그인 확인이 만료됐어요. 다시 로그인해 주세요.");
  }
}
