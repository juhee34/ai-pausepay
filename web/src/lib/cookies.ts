// 쿠키 상품과 규칙. 화면과 서버가 같이 쓴다. 가격과 개수는 임시 값이라 이 파일만 고치면 된다.
//
// 쿠키는 하루 무료 AI 횟수를 다 쓴 뒤에 1회에 1개를 쓴다. 지금은 모의 결제라 돈이 나가지 않는다.
// 돈을 받지 않는 만큼 AI 비용이 끝없이 나가지 않도록 하루에 넣을 수 있는 양을 제한한다.

import type { AiFeature } from "./ai-usage";

export const COOKIES_PER_AI_USE = 1;
export const MOCK_DAILY_COOKIE_CAP = 30;

export const COOKIE_PACKS = [
  { id: "small", cookies: 5, price: 500 },
  { id: "medium", cookies: 10, price: 900 },
  { id: "large", cookies: 30, price: 2500 },
] as const;
export type CookiePackId = (typeof COOKIE_PACKS)[number]["id"];

export function findCookiePack(id: unknown) {
  return COOKIE_PACKS.find((pack) => pack.id === id) ?? null;
}

// 화면을 열면 자동으로 부르는 기능은 쿠키를 쓰지 않는다. 사용자가 누르지 않았는데 쿠키가 빠지면 안 된다.
const COOKIE_FREE_FEATURES: readonly AiFeature[] = ["briefing"];
export function canUseCookie(feature: AiFeature) {
  return !COOKIE_FREE_FEATURES.includes(feature);
}

export type Wallet = {
  balance: number;
  pending: Record<string, number>; // 진행 중인 AI 요청의 예약. 값은 만료 시각. 성공해야 잔액에서 뺀다.
  purchasedOn: string; // 마지막으로 충전한 날 (YYYY-MM-DD)
  purchasedToday: number;
};

export type WalletSummary = {
  balance: number;
  available: number; // 진행 중인 요청을 뺀 잔액
  purchasedToday: number;
  dailyCap: number;
};

// 저장된 값이 이상해도 잔액을 만들어 내지 않는다. 만료된 예약은 빼서 쿠키가 묶이지 않게 한다.
export function readWallet(value: unknown, now: number): Wallet {
  const data = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const balance = typeof data.balance === "number" && Number.isSafeInteger(data.balance) && data.balance > 0 ? data.balance : 0;
  const pending = Object.fromEntries(
    Object.entries(data.pending && typeof data.pending === "object" ? data.pending : {}).filter(
      ([, until]) => typeof until === "number" && until > now,
    ),
  ) as Record<string, number>;
  const purchasedToday =
    typeof data.purchasedToday === "number" && Number.isSafeInteger(data.purchasedToday) && data.purchasedToday > 0
      ? data.purchasedToday
      : 0;
  return { balance, pending, purchasedOn: typeof data.purchasedOn === "string" ? data.purchasedOn : "", purchasedToday };
}

export function availableCookies(wallet: Wallet) {
  return Math.max(0, wallet.balance - Object.keys(wallet.pending).length);
}

export function formatWon(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}
