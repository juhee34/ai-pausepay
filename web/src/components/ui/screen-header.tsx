"use client";

import { AudioLines } from "lucide-react";
import type { ReactNode } from "react";
import VoiceCall from "@/app/voice-call";

// 머리 오른쪽의 둥근 버튼. 누르는 자리는 44px.
// 회색 바탕은 보조(우니스 부르기), 포인트색 바탕은 그 화면에서 무언가를 더하는 버튼(＋).
export const HEADER_BUTTON_CLASS =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fill text-ink active:bg-line";
export const HEADER_ADD_BUTTON_CLASS =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white active:bg-brand-strong";

// 우니스 부르기(음성 안내) 버튼. 누르면 검은 화면이 뜨고 오늘 할 일을 말로 들려준다.
// 전체 기능 버튼은 탭바 오른쪽에 있다 (2026-11-16 자리 바꿈).
export function VoiceButton() {
  return (
    <VoiceCall className={`${HEADER_BUTTON_CLASS} m-0! p-0! text-brand`}>
      <AudioLines size={20} strokeWidth={2} aria-hidden="true" />
    </VoiceCall>
  );
}

// 탭 첫 화면(오늘·일정·취업·내 정보)의 머리: 큰 제목과 오른쪽 둥근 버튼들.
// kicker(예: 날짜)가 있으면 윗줄에 작은 글 + 버튼, 그 아래 큰 제목. 없으면 큰 제목과 버튼이 한 줄.
// 오른쪽 끝에는 늘 '우니스 부르기' 버튼이 온다. 기능 화면(뒤로 가기가 있는 화면)에는 쓰지 않는다.
export default function ScreenHeader({
  kicker,
  title,
  sub,
  actions,
}: {
  kicker?: ReactNode; // 제목 위 작은 글 (예: 날짜)
  title: string;
  sub?: ReactNode;
  actions?: ReactNode; // '우니스 부르기' 왼쪽에 놓는 버튼
}) {
  const buttons = (
    <div className="flex shrink-0 items-center gap-2">
      {actions}
      <VoiceButton />
    </div>
  );
  const heading = <h1 className="min-w-0 text-[30px] leading-tight font-extrabold tracking-tight">{title}</h1>;

  return (
    <header className="mb-3.5 px-1 pt-2">
      {kicker ? (
        <>
          <div className="flex min-h-11 items-center justify-between gap-2">
            <p className="min-w-0 text-[13px] font-semibold text-muted">{kicker}</p>
            {buttons}
          </div>
          {heading}
        </>
      ) : (
        <div className="flex min-h-11 items-center justify-between gap-2">
          {heading}
          {buttons}
        </div>
      )}
      {sub && <p className="mt-1 text-[15px] leading-snug text-muted">{sub}</p>}
    </header>
  );
}
