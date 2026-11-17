"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Block from "@/components/ui/block";
import { formatHours } from "@/lib/today-plan";
import { useScoredTasks } from "@/lib/use-scored-tasks";
import TaskActions from "./task-actions";

const MAX_ROWS = 4;

// 과목 첫 글자 표시의 색. 같은 과목은 같은 색, 과목이 처음 나온 순서대로 돌려 쓴다.
const COURSE_COLORS = [
  "bg-brand-soft text-brand",
  "bg-assignment-soft text-assignment",
  "bg-quiz-soft text-quiz",
  "bg-review-soft text-review",
];

function dDay(days: number) {
  return days === 0 ? "D-day" : `D-${days}`;
}

// 오늘 화면: 큰 카드(오늘의 한 가지) 다음 순서의 할 일 네 개까지. 순서는 오늘의 한 가지 화면과 같다.
// 줄을 누르면 과목별 순서와 고치기가 있는 오늘의 한 가지 화면(/today)으로 간다.
export default function TodayNext() {
  const { today, scored, isExample, saved } = useScoredTasks();
  const rest = scored.slice(1, 1 + MAX_ROWS);
  if (!today || rest.length === 0) return null;

  const courses = [...new Set(scored.map((t) => t.course))];
  const colorOf = (course: string) => COURSE_COLORS[courses.indexOf(course) % COURSE_COLORS.length];

  return (
    <section aria-labelledby="today-next-title" className="mt-6">
      <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
        <h2 id="today-next-title" className="text-[20px] font-extrabold tracking-tight">
          과목별 할 일
        </h2>
        <Link href="/today" className="-my-2 flex min-h-11 items-center text-[15px] font-medium text-brand">
          모두 보기
        </Link>
      </div>
      <Block padded={false} className="divide-y divide-divider overflow-hidden">
        {rest.map((task) => (
          <div key={task.id}>
          <Link href="/today" className="flex min-h-14 items-center gap-3 px-4 py-2.5 active:bg-divider">
            <span
              aria-hidden="true"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-sm font-extrabold ${colorOf(task.course)}`}
            >
              {task.course.trim().slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px]">{task.title}</span>
              <span className="mt-px block truncate text-[13px] text-muted">
                {task.course} · 약 {formatHours(task.hours)}
              </span>
            </span>
            <span className={`shrink-0 font-mono text-[15px] font-semibold ${task.days <= 7 ? "text-brand" : "text-ink/80"}`}>
              {dDay(task.days)}
            </span>
            <ChevronRight size={18} strokeWidth={2} aria-hidden="true" className="shrink-0 text-muted/50" />
          </Link>
          {saved.filter((d) => d.id === task.id).map((d) => <TaskActions key={d.id} task={d} />)}
          </div>
        ))}
      </Block>
      {isExample && (
        <p className="mt-2 px-4 text-[13px] leading-snug text-muted">예시 일정이에요. 강의계획서를 올리면 내 과목으로 바뀌어요.</p>
      )}
    </section>
  );
}
