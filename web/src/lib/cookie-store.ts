import type { Firestore } from "firebase-admin/firestore";
import { seoulDay } from "./ai-usage";
import {
  MOCK_DAILY_COOKIE_CAP,
  availableCookies,
  findCookiePack,
  readWallet,
  type Wallet,
  type WalletSummary,
} from "./cookies";
import { freeCookiesOf } from "./ai-usage-store";
import { AccountApiError } from "./firebase-admin";
import { accountUsagePath, accountWalletPath } from "./firebase-paths";

// free: 오늘 남은 무료 쿠키. 화면은 free + balance를 쿠키 개수로 보여 준다.
function summaryOf(wallet: Wallet, day: string, free: number): WalletSummary {
  return {
    free,
    balance: wallet.balance,
    available: availableCookies(wallet),
    purchasedToday: wallet.purchasedOn === day ? wallet.purchasedToday : 0,
    dailyCap: MOCK_DAILY_COOKIE_CAP,
  };
}

export async function walletSummary(db: Firestore, uid: string, now = new Date()): Promise<WalletSummary> {
  const day = seoulDay(now);
  const [wallet, usage] = await Promise.all([
    db.doc(accountWalletPath(uid).join("/")).get(),
    db.doc(accountUsagePath(uid, day).join("/")).get(),
  ]);
  return summaryOf(readWallet(wallet.data(), now.getTime()), day, freeCookiesOf(usage.data(), now.getTime()));
}

// 모의 결제: 돈을 받지 않고 쿠키만 넣는다. 카드 정보는 받지도 저장하지도 않는다.
export async function mockPurchase(db: Firestore, uid: string, packId: unknown, now = new Date()): Promise<WalletSummary> {
  const pack = findCookiePack(packId);
  if (!pack) throw new AccountApiError(400, "상품을 다시 골라 주세요.");
  const day = seoulDay(now);
  const ref = db.doc(accountWalletPath(uid).join("/"));
  const usageRef = db.doc(accountUsagePath(uid, day).join("/"));
  let result: WalletSummary | null = null;
  await db.runTransaction(async (tx) => {
    const wallet = readWallet((await tx.get(ref)).data(), now.getTime());
    const free = freeCookiesOf((await tx.get(usageRef)).data(), now.getTime());
    const purchasedToday = wallet.purchasedOn === day ? wallet.purchasedToday : 0;
    if (purchasedToday + pack.cookies > MOCK_DAILY_COOKIE_CAP) {
      throw new AccountApiError(429, `시범 운영 중에는 쿠키를 하루 ${MOCK_DAILY_COOKIE_CAP}개까지 넣을 수 있어요.`);
    }
    const next: Wallet = {
      ...wallet,
      balance: wallet.balance + pack.cookies,
      purchasedOn: day,
      purchasedToday: purchasedToday + pack.cookies,
    };
    tx.set(ref, next);
    result = summaryOf(next, day, free);
  });
  return result as unknown as WalletSummary;
}
