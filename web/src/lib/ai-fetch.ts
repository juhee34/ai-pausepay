"use client";

import { getFirebaseAuth } from "./firebase";

// 첫 화면의 자동 브리핑도 Firebase의 로그인 복원이 끝난 뒤 요청한다.
// 토큰 발급 실패를 비로그인 요청으로 바꾸지 않는다.
export async function aiFetch(input: string, init: RequestInit = {}) {
  if (!/^\/api\/(briefing|syllabus|timetable|exam|mail|posting|receipt|usage|cookies|scores)$/.test(input)) {
    throw new Error("AI 요청 주소를 확인해 주세요.");
  }
  const auth = getFirebaseAuth();
  await auth?.authStateReady();
  const headers = new Headers(init.headers);
  const token = await auth?.currentUser?.getIdToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers, cache: "no-store" });
}
