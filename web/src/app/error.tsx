"use client";

import Link from "next/link";
import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";
import Button from "@/components/ui/button";

// 화면을 그리다 문제가 생겼을 때 빈 화면 대신 보여 준다. 저장된 기록은 지우지 않는다.
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <AppShell>
      <Block className="mt-10 text-center">
        <h1 className="text-[17px] font-bold">화면을 열지 못했어요</h1>
        <p className="mt-1 text-[13px] text-muted">내 기록은 그대로예요. 다시 시도해 주세요.</p>
        <Button onClick={() => retry()} className="mt-4 w-full">
          다시 시도
        </Button>
        <Link
          href="/"
          className="mt-1 flex min-h-11 items-center justify-center text-[15px] font-semibold text-brand"
        >
          홈으로 가기
        </Link>
      </Block>
    </AppShell>
  );
}
