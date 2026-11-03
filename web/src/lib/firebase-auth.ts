"use client";

import { useSyncExternalStore } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./firebase";

export type AccountState = {
  status: "loading" | "ready" | "unavailable" | "error";
  user: User | null;
  busy: boolean;
  error: string | null;
};

const INITIAL: AccountState = {
  status: isFirebaseConfigured() ? "loading" : "unavailable",
  user: null,
  busy: false,
  error: null,
};
let state = INITIAL;
let pending = false;
let unsubscribeAuth: (() => void) | null = null;
const listeners = new Set<() => void>();

function publish(next: AccountState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function accountErrorMessage(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? error.code : "";
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "로그인을 취소했어요. 로그인 없이도 계속 쓸 수 있어요.";
    case "auth/popup-blocked":
      return "로그인 창이 막혔어요. 사파리나 크롬에서 팝업을 허용하고 다시 눌러 주세요.";
    case "auth/network-request-failed":
      return "인터넷 연결을 확인하고 다시 해 주세요.";
    case "auth/unauthorized-domain":
    case "auth/operation-not-allowed":
    case "auth/invalid-api-key":
    case "auth/configuration-not-found":
      return "로그인 연결을 준비 중이에요. 로그인 없이도 계속 쓸 수 있어요.";
    case "auth/too-many-requests":
      return "잠시 요청이 많아요. 조금 뒤에 다시 해 주세요.";
    case "auth/web-storage-unsupported":
      return "이 브라우저에서 로그인을 유지할 수 없어요. 사파리나 크롬에서 다시 열어 주세요.";
    default:
      return "계정을 연결하지 못했어요. 잠시 뒤에 다시 해 주세요.";
  }
}

export function subscribeAccount(listener: () => void) {
  listeners.add(listener);
  if (!unsubscribeAuth) {
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        if (state.status !== "unavailable") publish({ ...INITIAL, status: "unavailable" });
      } else {
        publish({ ...INITIAL, status: "loading", busy: pending });
        unsubscribeAuth = onAuthStateChanged(auth, (user) => {
          publish({ status: "ready", user, busy: pending, error: null });
        }, (error) => {
          publish({ status: "error", user: null, busy: false, error: accountErrorMessage(error) });
        });
      }
    } catch (error) {
      publish({ status: "error", user: null, busy: false, error: accountErrorMessage(error) });
    }
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && unsubscribeAuth) {
      unsubscribeAuth();
      unsubscribeAuth = null;
    }
  };
}

export const getAccountSnapshot = () => state;
export const getServerAccountSnapshot = () => INITIAL;

export function useAccount() {
  return useSyncExternalStore(subscribeAccount, getAccountSnapshot, getServerAccountSnapshot);
}

export async function signInWithGoogle() {
  if (pending) return;
  pending = true;
  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      publish({ ...INITIAL, status: "unavailable" });
      return;
    }
    publish({ ...state, busy: true, error: null });
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    // 버튼 클릭 뒤 다른 비동기 작업을 기다리지 않고 창을 연다. 캘린더 권한은 추가하지 않는다.
    const result = await signInWithPopup(auth, provider);
    publish({ status: "ready", user: result.user, busy: false, error: null });
  } catch (error) {
    publish({ ...state, status: "error", busy: false, error: accountErrorMessage(error) });
  } finally {
    pending = false;
  }
}

export async function logOut() {
  if (pending) return;
  pending = true;
  try {
    const auth = getFirebaseAuth();
    if (!auth) return;
    publish({ ...state, busy: true, error: null });
    await signOut(auth);
    // 일정·점수 등의 localStorage는 건드리지 않는다. Firebase의 로그인만 해제한다.
    publish({ status: "ready", user: null, busy: false, error: null });
  } catch (error) {
    publish({ ...state, status: "error", busy: false, error: accountErrorMessage(error) });
  } finally {
    pending = false;
  }
}

// B의 계정 백업과 A의 사용자별 AI 사용량이 필요할 때 가져다 쓴다.
// 토큰을 별도 저장하지 않고, 서버에서는 반드시 firebase-admin으로 검증한다.
export async function getFirebaseIdToken() {
  return getFirebaseAuth()?.currentUser?.getIdToken() ?? null;
}
