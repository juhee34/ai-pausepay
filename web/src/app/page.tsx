import AppShell from "@/components/ui/app-shell";
import AddToHome from "./add-to-home";
import SavedList from "./calendar/saved-list";
import DayPlan from "./day-plan";
import HomeHeader from "./home-header";
import SummaryBlocks from "./summary-blocks";

// 오늘의 브리핑. 앱을 열면 바로 오늘 할 일과 이번 달 일정이 보이는 화면.
// 시간표·일정·대외활동은 이 기기 브라우저에만 있으므로 각 부분이 폰에서 직접 읽는다.
export default function Home() {
  return (
    <AppShell>
      <HomeHeader />
      <SummaryBlocks />
      <DayPlan />
      <SavedList />
      <AddToHome />
    </AppShell>
  );
}
