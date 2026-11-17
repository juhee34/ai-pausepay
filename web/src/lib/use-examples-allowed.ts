"use client";

import { useAccount } from "./firebase-auth";
import { useTimetable } from "./timetable-store";

// 로그인 확인 중에는 예시를 숨겨 실제 기록처럼 잠깐 보이는 것도 막는다.
export function useExamplesAllowed() {
  const account = useAccount();
  const timetable = useTimetable();
  return account.status !== "loading" && !account.user && timetable.length === 0;
}
