"use client";

import PostingFlow from "@/app/calendar/posting-flow";

// 취업 → 공고·자격증 올리기. AI가 공고에서 마감을 찾아 일정과 대외활동 카드를 함께 만든다.
// 직접 적는 활동은 취업 화면의 '직접 추가'(활동 추가 창)에서 한다.
export default function CareerPostingPage() {
  return <PostingFlow />;
}
