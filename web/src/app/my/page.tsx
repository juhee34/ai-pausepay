"use client";

import Link from "next/link";
import { ChevronLeft, LogIn, LogOut, Smartphone, UserRound } from "lucide-react";
import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";
import Button from "@/components/ui/button";
import { logOut, signInWithGoogle, useAccount } from "@/lib/firebase-auth";
import UsageCard from "./usage-card";

export default function MyPage() {
  const account = useAccount();
  const loading = account.status === "loading";
  const unavailable = account.status === "unavailable";
  const user = account.user;

  return (
    <AppShell>
      <Link href="/" className="-ml-1 mb-1 flex min-h-11 w-fit items-center gap-0.5 pr-2 text-xs font-semibold text-brand">
        <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />홈
      </Link>
      <header className="mb-4 px-1">
        <p className="text-xs font-medium text-muted">내 정보</p>
        <h1 className="text-[22px] font-bold">마이페이지</h1>
        <p className="mt-1 text-sm text-muted">내 계정과 기록 보관 방법을 확인해요.</p>
      </header>

      <Block>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <UserRound size={24} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold">{loading ? "계정 확인 중…" : user ? user.displayName || "우니스 사용자" : "로그인은 선택이에요"}</h2>
            <p className="mt-0.5 break-words text-xs text-muted">{user ? user.email || "Google로 연결한 계정" : "로그인하지 않아도 모든 기능을 쓸 수 있어요."}</p>
          </div>
        </div>
        <div className="mt-3 border-t border-divider pt-3">
          {user ? (
            <>
              <p className="mb-3 text-xs leading-relaxed text-muted">로그아웃해도 이 기기에 저장한 일정과 공부 기록은 그대로 남아요.</p>
              <Button variant="secondary" className="w-full" disabled={account.busy || loading} onClick={() => void logOut()}>
                <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />{account.busy ? "로그아웃 중…" : "로그아웃"}
              </Button>
            </>
          ) : (
            <>
              <p className="mb-3 text-xs leading-relaxed text-muted">Google 계정의 이름과 이메일로 연결해요. Google 캘린더 접근 권한은 요청하지 않아요.</p>
              <Button className="w-full" disabled={unavailable || loading || account.busy} onClick={() => void signInWithGoogle()}>
                <LogIn size={18} strokeWidth={1.8} aria-hidden="true" />{loading ? "계정 확인 중…" : account.busy ? "Google 로그인 중…" : "Google로 로그인"}
              </Button>
            </>
          )}
          {unavailable && <p role="status" className="mt-2 text-xs leading-relaxed text-muted">로그인은 준비 중이에요. 지금도 모든 기능을 사용할 수 있어요.</p>}
          {account.error && <p role="alert" className="mt-3 rounded-callout border border-review-line bg-review-soft p-3 text-sm text-review">{account.error}</p>}
        </div>
      </Block>

      <UsageCard key={user?.uid ?? "guest"} uid={user?.uid ?? null} />

      <Block className="mt-2.5">
        <div className="flex items-center gap-2">
          <Smartphone size={19} strokeWidth={1.8} aria-hidden="true" className="text-muted" />
          <h2 className="text-[15px] font-bold">내 기록은 이 기기에</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">일정·시간표·점수·공부 기록은 이 브라우저에 보관돼요. Google 로그인만으로 기록이 계정에 자동 저장되지는 않아요.</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">다른 폰으로 옮길 때는 홈 오른쪽 위 메뉴의 내보내기·가져오기를 이용해 주세요.</p>
      </Block>
    </AppShell>
  );
}
