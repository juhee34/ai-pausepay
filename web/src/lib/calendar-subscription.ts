// 서버 API에서만 사용한다. Firestore에는 주소 원문 대신 해시만 저장한다.
import { createHash, randomBytes } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { z } from "zod";
import { AccountApiError } from "./firebase-admin";
import { accountBackupPath } from "./firebase-paths";
import { buildCalendarFile } from "./calendar-file";
import { DEADLINE_KINDS } from "./syllabus";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const ownerPath = (uid: string) => {
  if (!uid || uid.includes("/")) throw new AccountApiError(401, "로그인을 다시 확인해 주세요.");
  return `calendarSubscriptions/${uid}`;
};
const tokenPath = (hash: string) => `calendarSubscriptionTokens/${hash}`;
export const subscriptionHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};
export function hashCalendarToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function calendarTokenFromPath(value: string): string | null {
  if (!value.endsWith(".ics")) return null;
  const token = value.slice(0, -4);
  return TOKEN_PATTERN.test(token) ? token : null;
}
export async function hasCalendarSubscription(db: Firestore, uid: string) {
  const data = (await db.doc(ownerPath(uid)).get()).data();
  return typeof data?.tokenHash === "string" && HASH_PATTERN.test(data.tokenHash);
}
export async function issueCalendarSubscription(db: Firestore, uid: string, action: "create" | "rotate") {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashCalendarToken(token);
  const owner = db.doc(ownerPath(uid));
  const nextToken = db.doc(tokenPath(tokenHash));
  await db.runTransaction(async (tx) => {
    const previous = (await tx.get(owner)).data()?.tokenHash;
    if (previous && action === "create") {
      throw new AccountApiError(409, "이미 구독 주소가 있어요. 주소 다시 만들기를 이용해 주세요.");
    }
    if (action === "rotate" && !previous) {
      throw new AccountApiError(409, "아직 구독 주소가 없어요. 먼저 주소를 만들어 주세요.");
    }
    // 재시도·동시 요청에도 마지막 주소 하나만 유효하도록 같은 트랜잭션에서 교체한다.
    if (typeof previous === "string" && HASH_PATTERN.test(previous)) tx.delete(db.doc(tokenPath(previous)));
    tx.set(owner, { tokenHash });
    tx.set(nextToken, { uid });
  });
  return `/api/calendar/${token}.ics`;
}

function isYmd(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > 9998) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
// B의 클라이언트 백업 모듈을 서버로 가져오지 않고 일정 필드만 검사·선택한다.
const CalendarBackupSchema = z.object({
  version: z.literal(1),
  data: z.object({ deadlines: z.array(z.object({
    id: z.string().min(1), title: z.string(), course: z.string(), when: z.string(),
    date: z.string().refine(isYmd), kind: z.enum(DEADLINE_KINDS),
  })) }),
});
export async function readSubscriptionCalendar(db: Firestore, token: string) {
  if (!TOKEN_PATTERN.test(token)) return null;
  const tokenHash = hashCalendarToken(token);
  const deadlines = await db.runTransaction(async (tx) => {
    const uid = (await tx.get(db.doc(tokenPath(tokenHash)))).data()?.uid;
    if (typeof uid !== "string" || !uid || uid.includes("/")) return null;
    const owner = (await tx.get(db.doc(ownerPath(uid)))).data();
    if (owner?.tokenHash !== tokenHash) return null;
    const backup = await tx.get(db.doc(accountBackupPath(uid).join("/")));
    if (!backup.exists) return [];
    const parsed = CalendarBackupSchema.safeParse(backup.data());
    // 손상된 백업을 빈 일정으로 바꾸면 기존 구독 일정이 사라질 수 있으므로 오류로 안내한다.
    if (!parsed.success) throw new AccountApiError(503, "계정에 백업한 일정을 확인하지 못했어요.");
    return parsed.data.data.deadlines;
  });
  return deadlines === null ? null : buildCalendarFile(deadlines);
}
