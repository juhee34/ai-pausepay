"use client";

import ScreenHeader from "@/components/ui/screen-header";
import { useToday } from "@/lib/briefing";
import { weekNumberOf } from "@/lib/risk";

function dateLine(today: string) {
  const [y, m, d] = today.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).toLocaleDateString("ko-KR", { weekday: "long" });
  const week = weekNumberOf(today);
  return `${m}월 ${d}일 ${weekday}${week >= 1 && week <= 16 ? ` · ${week}주차` : ""}`;
}

// 오늘 화면의 머리: 오늘 날짜와 주차, 오른쪽 우니스 부르기 버튼, 그 아래 큰 제목 '오늘'.
// 예전 홈 메뉴에 있던 것은 자리를 옮겼다: 강의계획서·시간표·할 일 넣기 → 일정 탭, 내보내기·가져오기 → 내 정보 화면.
export default function HomeHeader() {
  const today = useToday();
  // 날짜는 폰에서만 알 수 있어서, 읽기 전에는 자리를 비워 둔다.
  return <ScreenHeader kicker={today ? dateLine(today) : " "} title="오늘" />;
}
