"use client";

import { Cookie } from "lucide-react";
import { useEffect, useState } from "react";
import Block from "@/components/ui/block";
import BottomSheet from "@/components/ui/bottom-sheet";
import Button from "@/components/ui/button";
import { aiFetch } from "@/lib/ai-fetch";
import { DAILY_AI_LIMIT } from "@/lib/ai-usage";
import { COOKIE_PACKS, COOKIES_PER_AI_USE, formatWon, type CookiePackId, type WalletSummary } from "@/lib/cookies";

// uid가 바뀌면 부모의 key로 초기화한다. 늦게 도착한 이전 계정 응답은 버린다.
export default function CookieCard({ uid }: { uid: string | null }) {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(uid));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pack, setPack] = useState<CookiePackId>("medium");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await aiFetch("/api/cookies", { signal: controller.signal });
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setError(typeof result.error === "string" ? result.error : "쿠키를 불러오지 못했어요.");
          return;
        }
        setWallet(result);
        setError(null);
      } catch {
        if (!controller.signal.aborted) setError("쿠키를 불러오지 못했어요. 인터넷 연결과 로그인을 확인해 주세요.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [uid]);

  const selected = COOKIE_PACKS.find((p) => p.id === pack) ?? COOKIE_PACKS[0];
  const overCap = wallet !== null && wallet.purchasedToday + selected.cookies > wallet.dailyCap;

  async function pay() {
    setPaying(true);
    setPayError(null);
    try {
      const response = await aiFetch("/api/cookies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result) {
        setPayError(typeof result?.error === "string" ? result.error : "쿠키를 넣지 못했어요. 잠시 뒤에 다시 해 주세요.");
        return;
      }
      setWallet(result);
      setDone(`쿠키 ${selected.cookies}개를 넣었어요.`);
      setSheetOpen(false);
    } catch {
      setPayError("쿠키를 넣지 못했어요. 인터넷 연결을 확인하고 다시 해 주세요.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <Block className="mt-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cookie size={19} strokeWidth={1.8} aria-hidden="true" className="text-brand" />
          <h2 className="text-[15px] font-bold">쿠키</h2>
        </div>
        {uid && (
          <p className="font-mono text-xl font-semibold">
            {loading ? "…" : (wallet?.balance ?? "-")}
            <span className="ml-0.5 text-xs font-normal">개</span>
          </p>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        AI 기능은 하루 {DAILY_AI_LIMIT}회까지 무료예요. 다 쓰면 1회에 쿠키 {COOKIES_PER_AI_USE}개로 이어서 쓸 수 있어요. 일정 계산 화면은 쿠키가 필요 없어요.
      </p>
      {uid ? (
        <>
          {error && (
            <p role="alert" className="mt-2 text-sm leading-relaxed text-review">
              {error}
            </p>
          )}
          {done && (
            <p role="status" className="mt-2 text-sm font-semibold text-brand">
              {done}
            </p>
          )}
          <Button
            className="mt-3 w-full"
            disabled={loading || !wallet}
            onClick={() => {
              setPayError(null);
              setDone(null);
              setSheetOpen(true);
            }}
          >
            쿠키 충전하기
          </Button>
        </>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-muted">쿠키는 계정에 저장돼요. 위에서 로그인하면 충전할 수 있어요.</p>
      )}

      {sheetOpen && wallet && (
        <BottomSheet open onClose={() => setSheetOpen(false)} title="쿠키 충전">
          <p className="-mt-1 rounded-callout border border-review-line bg-review-soft p-3 text-xs font-semibold leading-relaxed text-review">
            시범 운영 중이라 실제로 결제되지 않아요. 카드 정보도 받지 않아요. 가격은 임시예요.
          </p>
          <div role="group" aria-label="쿠키 상품" className="mt-3 space-y-2">
            {COOKIE_PACKS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === pack}
                onClick={() => setPack(item.id)}
                className={`flex min-h-11 w-full items-center justify-between rounded-button border px-3.5 py-2.5 text-left ${
                  item.id === pack ? "border-brand bg-brand-soft" : "border-line bg-surface"
                }`}
              >
                <span className="text-sm font-bold">
                  쿠키 <span className="font-mono">{item.cookies}</span>개
                </span>
                <span className="font-mono text-sm font-semibold">{formatWon(item.price)}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            오늘 넣은 쿠키 <span className="font-mono">{wallet.purchasedToday}</span>개 · 하루 <span className="font-mono">{wallet.dailyCap}</span>개까지
          </p>
          {overCap && (
            <p role="alert" className="mt-1.5 text-xs font-semibold text-review">
              오늘은 이 상품을 넣을 수 없어요. 더 작은 상품을 고르거나 내일 다시 해 주세요.
            </p>
          )}
          {payError && (
            <p role="alert" className="mt-1.5 text-xs font-semibold text-review">
              {payError}
            </p>
          )}
          <Button className="mt-3 w-full" disabled={paying || overCap} onClick={() => void pay()}>
            {paying ? "넣는 중…" : `${formatWon(selected.price)} 모의 결제`}
          </Button>
        </BottomSheet>
      )}
    </Block>
  );
}
