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

// Firebase ID 토큰은 firebase-admin/auth 대신 jose로 직접 확인한다.
// firebase-admin/auth는 안에서 jose(ESM 전용)를 require로 불러오는데, Vercel에서는 Node 24에서도 실패했다
// (로그: account:load-auth … require() of ES Module jose not supported). 우리 코드가 import하면 빌드에 함께 묶인다.
// 확인 항목은 Firebase 문서 'Verify ID tokens using a third-party JWT library'와 같다.
// 로그아웃된 토큰을 바로 막는 확인(revocation)은 빠진다. 토큰은 1시간 뒤 저절로 만료된다.
const FIREBASE_KEYS_URL = new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
const MAX_UID_LENGTH = 128;
const CLOCK_SKEW_SECONDS = 5;

type Jose = typeof import("jose");
type KeySet = Parameters<Jose["jwtVerify"]>[1];
let firebaseKeys: KeySet | null = null;

// 맞으면 uid를 돌려주고, 아니면 예외를 던진다. keys는 시험에서 가짜 키를 넣을 때만 쓴다.
export async function verifyFirebaseIdToken(token: string, projectId: string, jose: Jose, keys?: KeySet) {
  const keySet = keys ?? (firebaseKeys ??= jose.createRemoteJWKSet(FIREBASE_KEYS_URL));
  const { payload } = await jose.jwtVerify(token, keySet, {
    algorithms: ["RS256"],
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    requiredClaims: ["exp", "iat", "sub", "auth_time"],
    clockTolerance: CLOCK_SKEW_SECONDS,
  });
  const now = Math.floor(Date.now() / 1000) + CLOCK_SKEW_SECONDS;
  const uid = payload.sub;
  if (typeof uid !== "string" || !uid || uid.length > MAX_UID_LENGTH || uid.includes("/")) throw new Error("invalid uid");
  if (typeof payload.iat !== "number" || payload.iat > now) throw new Error("issued in the future");
  if (typeof payload.auth_time !== "number" || payload.auth_time > now) throw new Error("signed in in the future");
  return uid;
}

// 구글 공개 키를 받아 오지 못한 것은 토큰 잘못이 아니라 잠깐의 연결 문제다.
function isKeyFetchError(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? error.code : "";
  return code === "ERR_JWKS_TIMEOUT" || (error instanceof TypeError && /fetch/i.test(error.message));
}

// uid는 화면 입력이 아닌 Firebase가 검증한 ID 토큰에서만 얻는다.
export async function verifiedUid(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization");
  if (header === null) return null;
  if (!/^Bearer \S+$/.test(header) || header.length > 8192) {
    throw new AccountApiError(401, "로그인을 다시 확인해 주세요.");
  }
  const projectId = cleanEnvValue(process.env.FIREBASE_ADMIN_PROJECT_ID) ?? cleanEnvValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  if (!projectId) {
    throw new AccountApiError(503, "계정별 AI 사용량 연결을 준비 중이에요. 잠시 뒤에 다시 해 주세요.");
  }
  let jose: Jose;
  try {
    jose = await import("jose");
  } catch (error) {
    if (!(error instanceof AccountApiError)) logAccountError("load-auth", error);
    throw error;
  }
  try {
    return await verifyFirebaseIdToken(header.slice(7), projectId, jose);
  } catch (error) {
    if (isKeyFetchError(error)) {
      logAccountError("verify-token", error);
      throw new AccountApiError(503, "로그인 확인이 잠시 늦어요. 잠시 뒤에 다시 해 주세요.");
    }
    throw new AccountApiError(401, "로그인 확인이 만료됐어요. 다시 로그인해 주세요.");
  }
}
