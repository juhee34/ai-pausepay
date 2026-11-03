import Link from "next/link";
import Activities from "./activities";
import AddToHome from "./add-to-home";
import TodayDate from "./today-date";
import TodayPick from "./today-pick";
import WeekDeadlines from "./week-deadlines";

// 오늘의 브리핑. 앱을 열면 바로 오늘 할 일이 보이는 화면.
// 일정·대외활동은 이 기기 브라우저에만 있으므로 각 카드가 폰에서 직접 읽는다.
export default function Home() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-md px-5 pt-12 pb-20">
        <p className="text-accent text-xs font-semibold tracking-widest">오늘의 브리핑</p>
        <TodayDate />

        <div className="mt-6">
          <TodayPick />
        </div>
        {/* 홈을 새 디자인으로 바꿀 때 '다음 수업' 블록이 이 링크를 대신한다 */}
        <Link
          href="/timetable"
          className="mt-3 block rounded-2xl bg-foreground/[0.04] px-4 py-3 text-sm font-semibold"
        >
          KLAS 시간표 올리기 →
        </Link>
        <WeekDeadlines />
        <Activities />
        <AddToHome />
      </section>
    </main>
  );
}
