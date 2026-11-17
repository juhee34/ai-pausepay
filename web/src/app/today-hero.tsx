"use client";

import Link from "next/link";
import { ChevronRight, Sparkles, Timer } from "lucide-react";
import { DEFAULT_AVAILABLE_HOURS, formatHours, planToday } from "@/lib/today-plan";
import { useScoredTasks } from "@/lib/use-scored-tasks";
import TaskActions from "./task-actions";

function dDay(days: number) {
  return days === 0 ? "D-day" : `D-${days}`;
}

// 오늘 화면 맨 위의 큰 카드: 오늘의 한 가지. 순서는 오늘의 한 가지 화면(/today)과 같은 계산을 쓴다.
// 쓸 시간을 바꾸거나 과목별 순서를 보려면 '자세히'로 그 화면에 간다.
export default function TodayHero() {
  const { today, scored, saved } = useScoredTasks();
  if (!today) return <div className="h-64 rounded-block bg-surface shadow-card" />;

  const plan = planToday(scored, DEFAULT_AVAILABLE_HOURS);
  const main = plan.picks[0];

  return (
    <section aria-label="오늘의 한 가지" className="rounded-block bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-brand">
          <Sparkles size={15} strokeWidth={2} aria-hidden="true" />
          오늘의 한 가지
        </p>
        <span className="text-[13px] text-muted">오늘 쓸 시간 {formatHours(DEFAULT_AVAILABLE_HOURS)}</span>
      </div>

      {main ? (
        <>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-muted">{main.task.course}</p>
              <p className="mt-0.5 break-words text-[23px] leading-tight font-extrabold tracking-tight">{main.task.title}</p>
              <p className="mt-1.5 font-mono text-sm text-muted">
                배점 {Math.round(main.task.weight * 10) / 10}% · 약 {formatHours(main.task.hours)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-semibold text-muted">마감까지</p>
              <p className="font-mono text-[30px] leading-none font-extrabold text-brand">{dDay(main.task.days)}</p>
            </div>
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/80">{main.task.reason}</p>
          <div className="mt-4 flex gap-2.5">
            <Link
              href={`/focus?deadline=${encodeURIComponent(main.task.id)}&course=${encodeURIComponent(main.task.course)}&hours=${main.hours}`}
              className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-brand text-base font-bold text-white active:bg-brand-strong"
            >
              <Timer size={18} strokeWidth={2} aria-hidden="true" />
              집중 시작
            </Link>
            <Link
              href="/today"
              className="flex min-h-12 shrink-0 items-center justify-center gap-0.5 rounded-full bg-fill pr-3.5 pl-5 text-base font-semibold text-ink active:bg-line"
            >
              자세히
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
          {saved.filter((d) => d.id === main.task.id).map((d) => <TaskActions key={d.id} task={d} />)}
        </>
      ) : (
        <>
          <p className="mt-3 text-[20px] leading-tight font-extrabold tracking-tight">{saved.length === 0 ? "할 일을 추가하세요" : "오늘은 급한 마감이 없어요"}</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted">할 일을 넣거나 강의계획서를 올리면 마감 전 할 일 중에서 골라 드려요.</p>
          <Link
            href="/today"
            className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-brand text-base font-bold text-white active:bg-brand-strong"
          >
            할 일 추가하기
          </Link>
        </>
      )}
    </section>
  );
}
