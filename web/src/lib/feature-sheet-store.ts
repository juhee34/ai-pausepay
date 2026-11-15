"use client";

// '전체 기능' 창을 여닫는 상태. 창과 여는 버튼 모두 탭바(BottomTabBar)에 있다. 저장하지 않는다.

import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useFeatureSheetOpen() {
  return useSyncExternalStore(subscribe, () => open, () => false);
}

export function setFeatureSheetOpen(next: boolean) {
  if (open === next) return;
  open = next;
  listeners.forEach((listener) => listener());
}
