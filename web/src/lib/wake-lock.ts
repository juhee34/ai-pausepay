"use client";

// 집중 타이머가 도는 동안 폰 화면이 꺼지지 않게 한다.
// 폰은 화면이 꺼지면 웹페이지를 멈춰서, 시간이 끝나도 알림 소리·진동이 제때 나지 않을 수 있다.
//
// 브라우저의 화면 켜 두기 기능(Screen Wake Lock API)을 쓴다. 다른 앱이나 탭에 다녀오면 브라우저가 이 잠금을 풀어서,
// 화면으로 돌아올 때(visibilitychange) 다시 건다. 이 '풀리면 돌아올 때 다시 걸기' 방식은 NoSleep.js를 따랐다.
// 출처: NoSleep.js (https://github.com/richtr/NoSleep.js), MIT License, Copyright (c) Rich Tibbett
// 패키지는 설치하지 않았고, NoSleep.js의 옛 아이폰용 영상 재생 우회는 가져오지 않았다 (아이폰은 16.4부터 이 기능을 지원).
// 지원하지 않는 브라우저에서는 아무 일도 하지 않는다. 자세한 내용은 docs/개발가이드.md '참고 자료'.

import { useEffect } from "react";

type Sentinel = { released: boolean; release(): Promise<void> };
type WakeLockApi = { request(type: "screen"): Promise<Sentinel> };

function wakeLockApi(): WakeLockApi | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock ?? null;
}

// 화면 켜 두기를 시작하고, 끝낼 때 부를 함수를 돌려준다.
export function keepScreenAwake(): () => void {
  const api = wakeLockApi();
  if (!api) return () => {};

  let sentinel: Sentinel | null = null;
  let stopped = false;

  async function acquire() {
    if (stopped || document.visibilityState !== "visible") return;
    if (sentinel && !sentinel.released) return;
    try {
      const next = await api!.request("screen");
      // 기다리는 사이에 끝났으면 바로 푼다.
      if (stopped) void next.release().catch(() => {});
      else sentinel = next;
    } catch {
      // 배터리 절약 모드 등으로 거절되면 그냥 둔다. 타이머는 그대로 돈다.
    }
  }

  const onVisible = () => {
    if (document.visibilityState === "visible") void acquire();
  };
  document.addEventListener("visibilitychange", onVisible);
  void acquire();

  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", onVisible);
    void sentinel?.release().catch(() => {});
    sentinel = null;
  };
}

// active인 동안만 화면을 켜 둔다.
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    return keepScreenAwake();
  }, [active]);
}
