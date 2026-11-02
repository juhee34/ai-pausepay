"use client";

import { useSyncExternalStore } from "react";

// '홈 화면에 추가' 안내. 아이폰은 7일 동안 안 열면 저장 데이터가 지워질 수 있어서, 앱처럼 추가해 두게 한다.
// 이미 홈 화면 앱으로 열었거나 '닫기'를 누르면 보이지 않는다.
const DISMISS_KEY = "unis.addToHome.dismissed";

const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function shouldShow() {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  let dismissed = false;
  try {
    dismissed = localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // 저장 공간을 못 쓰면 안내를 계속 보여 준다.
  }
  return !standalone && !dismissed;
}

function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // 무시
  }
  listeners.forEach((listener) => listener());
}

export default function AddToHome() {
  const show = useSyncExternalStore(subscribe, shouldShow, () => false);
  if (!show) return null;

  return (
    <section className="mt-8 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold">홈 화면에 우니스 추가하기</h2>
        <button type="button" onClick={dismiss} className="shrink-0 text-xs text-foreground/40">
          닫기
        </button>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-foreground/60">
        앱처럼 바로 열 수 있어요. 아이폰은 7일 동안 열지 않으면 저장한 일정이 지워질 수 있으니 꼭 추가해 두세요.
      </p>
      <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-foreground/70">
        <li>
          <b>아이폰</b> · 사파리 아래 <b>공유</b> 버튼 → <b>홈 화면에 추가</b>
        </li>
        <li>
          <b>안드로이드</b> · 크롬 오른쪽 위 <b>⋮</b> → <b>홈 화면에 추가</b>
        </li>
      </ul>
    </section>
  );
}
