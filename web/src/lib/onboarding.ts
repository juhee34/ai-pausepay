"use client";

import { useSyncExternalStore } from "react";

export const ONBOARDING_KEY = "unis.onboarding.v1";
const EVENT = "unis-onboarding-change";
let memorySeen = false;

export function readOnboardingSeen() {
  try { return memorySeen || localStorage.getItem(ONBOARDING_KEY) === "true"; }
  catch { return memorySeen; }
}
export function finishOnboarding() {
  memorySeen = true;
  try { localStorage.setItem(ONBOARDING_KEY, "true"); } catch { /* 저장 차단 시에도 앱 이용 가능 */ }
  window.dispatchEvent(new Event(EVENT));
}
function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener("storage", listener); };
}
export function useOnboardingSeen() {
  return useSyncExternalStore(subscribe, readOnboardingSeen, () => null);
}
