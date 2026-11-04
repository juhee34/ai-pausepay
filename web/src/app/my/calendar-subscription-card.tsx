"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Copy, RefreshCw } from "lucide-react";
import Block from "@/components/ui/block";
import Button from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/firebase";
import { copyText } from "@/lib/copy-text";

const API = "/api/calendar/subscription";
export default function CalendarSubscriptionCard({ uid }: { uid: string }) {
  const [active, setActive] = useState<boolean | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const request = useCallback(async (init: RequestInit) => {
    const auth = getFirebaseAuth();
    await auth?.authStateReady();
    const user = auth?.currentUser;
    if (!user || user.uid !== uid) throw new Error("account changed");
    const token = await user.getIdToken();
    return fetch(API, { ...init, cache: "no-store", headers: {
      "Authorization": `Bearer ${token}`, "Content-Type": "application/json",
    } });
  }, [uid]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await request({ signal: controller.signal });
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setError(data.error ?? "구독 상태를 확인하지 못했어요.");
          return;
        }
        if (typeof data.active !== "boolean") throw new Error("invalid response");
        setActive(data.active);
      } catch {
        if (!controller.signal.aborted) setError("구독 주소를 확인하지 못했어요. 인터넷 연결과 로그인을 확인해 주세요.");
      }
    }
    void load();
    return () => controller.abort();
  }, [request, revision]);

  async function issue() {
    if (busy || active === null) return;
    if (active && !window.confirm("기존 구독 주소가 바로 중지돼요. 새 주소를 만든 뒤 캘린더 앱에도 다시 등록해 주세요. 계속할까요?")) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setAddress(null);
    try {
      const response = await request({ method: "POST", body: JSON.stringify({ action: active ? "rotate" : "create" }) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) setRevision((n) => n + 1);
        setError(data.error ?? "구독 주소를 만들지 못했어요.");
        return;
      }
      if (typeof data.path !== "string" || !/^\/api\/calendar\/[A-Za-z0-9_-]{43}\.ics$/.test(data.path)) throw new Error("invalid path");
      setAddress(`${window.location.origin}${data.path}`);
      setActive(true);
      setNotice("주소를 만들었어요. 지금 복사해서 캘린더 앱에 등록해 주세요.");
    } catch {
      setError("응답을 확인하지 못했어요. 주소가 바뀌었을 수 있으니 다시 확인한 뒤 필요하면 재발급해 주세요.");
      setActive(null);
    } finally { setBusy(false); }
  }

  return (
    <Block className="mt-2.5">
      <div className="flex items-center gap-2">
        <CalendarDays size={19} strokeWidth={1.8} aria-hidden="true" className="text-muted" />
        <h2 className="text-[15px] font-bold">캘린더 구독</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">계정에 백업한 일정이 구독에 나와요. 일정을 바꾼 뒤 위의 계정 백업을 다시 해 주세요.</p>
      <p className="mt-2 text-xs leading-relaxed text-muted">백업이 없으면 빈 캘린더로 보여요. 캘린더 앱이 주기적으로 가져오며, 구글은 반영에 몇 시간이 걸릴 수 있어요.</p>
      {active === null && !error && <p role="status" className="mt-3 text-xs text-muted">구독 주소 확인 중…</p>}
      {active && !address && <p className="mt-3 text-xs leading-relaxed text-muted">이미 만든 구독 주소가 있어요. 보안을 위해 주소는 만든 직후에만 보여요. 주소를 잃어버렸다면 다시 만들어 주세요.</p>}
      {address && (
        <div className="mt-3">
          <label htmlFor="calendar-subscription-url" className="text-xs font-semibold">내 구독 주소</label>
          <input id="calendar-subscription-url" type="text" readOnly value={address} spellCheck={false} autoComplete="off"
            className="mt-1 min-h-11 w-full min-w-0 rounded-button border border-line bg-surface px-3 text-[16px] font-mono" />
          <Button variant="secondary" className="mt-2 w-full" onClick={async () => {
            if (await copyText(address).catch(() => false)) setNotice("구독 주소를 복사했어요.");
            else setError("복사하지 못했어요. 주소 입력칸에서 직접 복사해 주세요.");
          }}><Copy size={16} strokeWidth={1.8} aria-hidden="true" />주소 복사</Button>
        </div>
      )}
      <p className="mt-3 text-xs font-semibold text-review">주소를 남에게 알려 주지 마세요. 이 주소를 아는 사람은 내 일정을 볼 수 있어요.</p>
      {active !== null && <Button variant="secondary" className="mt-3 w-full" disabled={busy} onClick={() => void issue()}>
        {active && <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />}
        {busy ? "주소 만드는 중…" : active ? "주소 다시 만들기" : "캘린더 구독 주소 만들기"}
      </Button>}
      {active === null && error && <Button variant="secondary" className="mt-3 w-full" onClick={() => { setError(null); setRevision((n) => n + 1); }}>다시 확인</Button>}
      {notice && <p role="status" className="mt-2 text-xs leading-relaxed text-muted">{notice}</p>}
      {error && <p role="alert" className="mt-2 text-xs leading-relaxed text-review">{error}</p>}
      <details className="mt-3 border-t border-divider pt-2">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">구글·아이폰 캘린더에서 구독하는 방법</summary>
        <div className="space-y-3 text-xs leading-relaxed text-muted">
          <p><strong className="text-ink">구글 캘린더</strong><br />컴퓨터에서 구글 캘린더를 열고, 다른 캘린더 옆 ＋ → URL로 추가 → 복사한 주소 → 캘린더 추가를 선택해요. 등록 후 같은 계정의 휴대폰 구글 캘린더에서 볼 수 있어요.</p>
          <p><strong className="text-ink">아이폰 캘린더</strong><br />캘린더 앱 → 하단 캘린더 → 캘린더 추가 → 구독 캘린더 추가에서 주소를 붙여 넣고 구독해요. iOS 버전에 따라 설정 앱의 캘린더 계정 → 계정 추가 → 기타 → 구독 캘린더 추가에서 등록할 수도 있어요.</p>
          <p>새 주소를 만들면 기존 주소를 쓰는 구독은 갱신되지 않아요. 캘린더 앱의 예전 구독을 지우고 새 주소로 등록해 주세요. 이미 내려받은 일정은 캘린더 앱에 남을 수 있어요.</p>
          <p>주소는 이 화면에서만 잠시 보여요. 새로고침·로그아웃 후에는 원래 주소를 다시 표시할 수 없어요.</p>
        </div>
      </details>
    </Block>
  );
}
