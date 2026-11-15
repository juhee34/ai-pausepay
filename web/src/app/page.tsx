import AppShell from "@/components/ui/app-shell";
import AddToHome from "./add-to-home";
import DayPlan from "./day-plan";
import HomeHeader from "./home-header";
import SummaryBlocks from "./summary-blocks";
import TodayHero from "./today-hero";
import TodayNext from "./today-next";

// 오늘 탭. 앱을 열면 바로 오늘의 한 가지와 과목별 할 일이 보이고, 아래로 내리면 다가오는 일정과 오늘 일정이 나온다.
// 달력과 저장한 일정 목록은 일정 탭(/schedule)에 있다.
// 시간표·일정·대외활동은 이 기기 브라우저에만 있으므로 각 부분이 폰에서 직접 읽는다.
export default function Home() {
  return (
    <AppShell>
      <HomeHeader />
      <TodayHero />
      <TodayNext />
      {/* 아래로 내리면: 다가오는 일정(다음 수업·이번 주 마감·기말고사)과 오늘 일정 */}
      <h2 className="mt-6 mb-2 px-1 text-[20px] font-extrabold tracking-tight">다가오는 일정</h2>
      <SummaryBlocks />
      <DayPlan calendar={false} />
      <AddToHome />
    </AppShell>
  );
}
