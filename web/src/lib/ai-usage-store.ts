import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { COOKIES_PER_AI_USE, availableCookies, canUseCookie, readWallet } from "./cookies";
import { accountUsagePath, accountWalletPath } from "./firebase-paths";
import { AccountApiError } from "./firebase-admin";
import { DAILY_AI_LIMIT, emptyCounts, readCounts, seoulDay, totalCounts, weekStart, type AiFeature, type UsageSummary } from "./ai-usage";

// paid: 무료 횟수를 다 써서 쿠키로 예약한 요청. 쿠키는 성공했을 때만 잔액에서 뺀다.
type Lease = { uid: string; day: string; id: string; feature: AiFeature; paid: boolean };
// API의 60초 상한보다 길게 예약. 강제 종료된 예약은 다음 요청에서 회수한다.
const LEASE_MS = 120_000;
function pendingLeases(value: unknown, now: number): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).filter(([, until]) => typeof until === "number" && until > now));
}
export async function reserveUsage(db: Firestore, uid: string, feature: AiFeature, now = new Date()): Promise<Lease> {
  const day = seoulDay(now);
  const id = randomUUID();
  const ref = db.doc(accountUsagePath(uid, day).join("/"));
  const walletRef = db.doc(accountWalletPath(uid).join("/"));
  let paid = false;
  await db.runTransaction(async (tx) => {
    paid = false; // 트랜잭션은 다시 실행될 수 있다.
    const data = (await tx.get(ref)).data();
    const counts = readCounts(data?.counts);
    const pending = pendingLeases(data?.pending, now.getTime());
    if (totalCounts(counts) + Object.keys(pending).length < DAILY_AI_LIMIT) {
      pending[id] = now.getTime() + LEASE_MS;
      tx.set(ref, { counts, pending });
      return;
    }
    if (!canUseCookie(feature)) {
      throw new AccountApiError(429, "오늘 무료 AI 횟수를 모두 썼어요. 내일 다시 써 주세요.");
    }
    const wallet = readWallet((await tx.get(walletRef)).data(), now.getTime());
    if (availableCookies(wallet) < COOKIES_PER_AI_USE) {
      throw new AccountApiError(429, "오늘 무료 AI 횟수를 모두 썼어요. 내일 다시 쓰거나, 마이페이지에서 쿠키를 충전해 주세요.");
    }
    tx.set(walletRef, { ...wallet, pending: { ...wallet.pending, [id]: now.getTime() + LEASE_MS } });
    paid = true;
  });
  return { uid, day, id, feature, paid };
}
export async function settleUsage(db: Firestore, lease: Lease, success: boolean) {
  const ref = db.doc(accountUsagePath(lease.uid, lease.day).join("/"));
  if (lease.paid) {
    const walletRef = db.doc(accountWalletPath(lease.uid).join("/"));
    await db.runTransaction(async (tx) => {
      const data = (await tx.get(ref)).data();
      const stored = (await tx.get(walletRef)).data();
      const held = { ...(stored?.pending ?? {}) } as Record<string, number>;
      if (!(lease.id in held)) return; // 다시 실행해도 쿠키를 두 번 빼지 않는다
      delete held[lease.id];
      const wallet = readWallet(stored, 0);
      if (success) {
        const counts = readCounts(data?.counts);
        counts[lease.feature]++;
        tx.set(ref, { counts, pending: data?.pending ?? {} });
      }
      tx.set(walletRef, {
        ...wallet,
        pending: held,
        balance: success ? Math.max(0, wallet.balance - COOKIES_PER_AI_USE) : wallet.balance,
      });
    });
    return;
  }
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data();
    const pending = { ...(data?.pending ?? {}) } as Record<string, number>;
    if (!(lease.id in pending)) return; // 다시 실행해도 중복 집계하지 않는다
    delete pending[lease.id];
    const counts = readCounts(data?.counts);
    if (success) counts[lease.feature]++;
    tx.set(ref, { counts, pending });
  });
}
export async function usageSummary(db: Firestore, uid: string, now = new Date()): Promise<UsageSummary> {
  const today = seoulDay(now);
  const start = weekStart(today);
  const snapshot = await db.collection(`users/${uid}/usage`).where("__name__", ">=", start).where("__name__", "<=", today).get();
  let todayCounts = emptyCounts();
  const weekCounts = emptyCounts();
  let pending = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const counts = readCounts(data.counts);
    if (doc.id === today) { todayCounts = counts; pending = Object.keys(pendingLeases(data.pending, now.getTime())).length; }
    for (const key of Object.keys(weekCounts) as AiFeature[]) weekCounts[key] += counts[key];
  }
  const usedToday = totalCounts(todayCounts);
  return { today, weekStart: start, dailyLimit: DAILY_AI_LIMIT, usedToday, remaining: Math.max(0, DAILY_AI_LIMIT - usedToday - pending), todayCounts, weekCounts };
}
