"use client";

// 로고 음성 안내에서 불러 줄 이름. 이 기기 브라우저(localStorage)에만 둔다. 서버·계정 백업으로 보내지 않는다.

import { useSyncExternalStore } from "react";
import { MAX_NICKNAME } from "./voice-script";

const STORAGE_KEY = "unis.nickname.v1";
const listeners = new Set<() => void>();

function read() {
  try {
    return (localStorage.getItem(STORAGE_KEY) ?? "").slice(0, MAX_NICKNAME);
  } catch {
    return "";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useNickname() {
  return useSyncExternalStore(subscribe, read, () => "");
}

export function saveNickname(name: string) {
  const value = name.trim().slice(0, MAX_NICKNAME);
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 저장할 수 없는 브라우저(사생활 보호 모드 등)에서는 이름 없이 부른다.
  }
  listeners.forEach((listener) => listener());
}
