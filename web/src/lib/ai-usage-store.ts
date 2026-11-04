import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { accountUsagePath } from "./firebase-paths";
import { AccountApiError } from "./firebase-admin";
import { DAILY_AI_LIMIT, emptyCounts, readCounts, seoulDay, totalCounts, weekStart, type AiFeature, type UsageSummary } from "./ai-usage";

type Lease = { uid: string; day: string; id: string; feature: AiFeature };
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
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data();
    const counts = readCounts(data?.counts);
    const pending = pendingLeases(data?.pending, now.getTime());
    if (totalCounts(counts) + Object.keys(pending).length >= DAILY_AI_LIMIT) {
      throw new AccountApiError(429, "오늘 AI 사용 가능 횟수를 모두 썼거나 요청이 진행 중이에요. 잠시 뒤 또는 내일 다시 써 주세요.");
    }
    pending[id] = now.getTime() + LEASE_MS;
    tx.set(ref, { counts, pending });
  });
  return { uid, day, id, feature };
}
export async function settleUsage(db: Firestore, lease: Lease, success: boolean) {
  const ref = db.doc(accountUsagePath(lease.uid, lease.day).join("/"));
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
