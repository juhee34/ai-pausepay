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
import { AccountApiError } from "./firebase-admin";
import { accountWalletPath } from "./firebase-paths";

function summaryOf(wallet: Wallet, day: string): WalletSummary {
  return {
    balance: wallet.balance,
    available: availableCookies(wallet),
    purchasedToday: wallet.purchasedOn === day ? wallet.purchasedToday : 0,
    dailyCap: MOCK_DAILY_COOKIE_CAP,
  };
}

export async function walletSummary(db: Firestore, uid: string, now = new Date()): Promise<WalletSummary> {
  const snapshot = await db.doc(accountWalletPath(uid).join("/")).get();
  return summaryOf(readWallet(snapshot.data(), now.getTime()), seoulDay(now));
}

// 모의 결제: 돈을 받지 않고 쿠키만 넣는다. 카드 정보는 받지도 저장하지도 않는다.
export async function mockPurchase(db: Firestore, uid: string, packId: unknown, now = new Date()): Promise<WalletSummary> {
  const pack = findCookiePack(packId);
  if (!pack) throw new AccountApiError(400, "상품을 다시 골라 주세요.");
  const day = seoulDay(now);
  const ref = db.doc(accountWalletPath(uid).join("/"));
  let result: WalletSummary | null = null;
  await db.runTransaction(async (tx) => {
    const wallet = readWallet((await tx.get(ref)).data(), now.getTime());
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
    result = summaryOf(next, day);
  });
  return result as unknown as WalletSummary;
}
