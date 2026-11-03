"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Timer } from "lucide-react";
import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";
import { useToday } from "@/lib/briefing";
import { useSavedDeadlines } from "@/lib/deadline-store";
import { getLatestAccuracy } from "@/lib/exam-results";
import { useGrades } from "@/lib/grades-store";
import { useGrading } from "@/lib/grading-store";
import { weekNumberOf } from "@/lib/risk";
import {
  HOUR_CHIPS,
  exampleTasks,
  formatHours,
  planToday,
  scoreTasks,
  type EfficiencyLevel,
  type PlanTask,
  type ScoredTask,
} from "@/lib/today-plan";

const MAX_CANDIDATES = 5;

const LEVEL_CLASS: Record<EfficiencyLevel, string> = {
  높음: "bg-brand-soft text-brand",
  보통: "border border-line bg-surface text-muted",
  낮음: "bg-divider text-muted",
};

function badge(className: string, label: string) {
  return (
    <span className={`inline-flex h-[22px] shrink-0 items-center rounded-full px-2 text-[11px] font-bold ${className}`}>
      {label}
    </span>
  );
}

function dDay(days: number) {
  return days === 0 ? "D-day" : `D-${days}`;
}

function meta(task: ScoredTask) {
  return `배점 ${Math.round(task.weight * 10) / 10}% · ${dDay(task.days)} · 약 ${formatHours(task.hours)}`;
}

function headerDate(today: string) {
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString("ko-KR", { weekday: "long" });
  const week = weekNumberOf(today);
  return `${m}월 ${d}일 ${weekday}${week >= 1 && week <= 16 ? ` · ${week}주차` : ""}`;
}

export default function TodayPage() {
  const today = useToday();
  const saved = useSavedDeadlines();
  const grading = useGrading();
  const grades = useGrades();
  const [available, setAvailable] = useState<number>(2);

  const isExample = saved.length === 0;

  const scored = useMemo(() => {
    if (!today) return [];
    const tasks: PlanTask[] = isExample
      ? exampleTasks(today)
      : saved
          .filter((d) => !d.done)
          .map((d) => ({ id: d.id, course: d.course, title: d.title, date: d.date, kind: d.kind }));
    const courses = [...new Set(tasks.map((t) => t.course))];
    const accuracy: Record<string, number> = {};
    for (const course of courses) {
      const value = isExample ? null : getLatestAccuracy(course);
      if (value !== null) accuracy[course] = value;
    }
    const targets: Record<string, number> = {};
    if (!isExample) for (const [course, g] of Object.entries(grades)) targets[course] = g.target;
    return scoreTasks(today, tasks, {
      grading: isExample ? {} : grading,
      targets,
      accuracy,
      allTasks: isExample ? [] : saved.map((d) => ({ course: d.course, kind: d.kind })),
    });
  }, [today, isExample, saved, grading, grades]);

  const plan = planToday(scored, available);
  const pickedIds = new Set(plan.picks.map((p) => p.task.id));
  const top = scored[0]?.efficiency ?? 0;
  const [main, ...more] = plan.picks;

  return (
    <AppShell>
      <div className="flex min-h-7 items-center justify-between">
        <span className="text-xs font-semibold text-brand">우니스</span>
        {today && isExample && (
          <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
            예시 데이터
          </span>
        )}
      </div>

      <h1 className="mt-1 text-[22px] font-bold">오늘의 한 가지</h1>
      <p className="mt-1 min-h-5 text-[13px] text-muted">{today ? headerDate(today) : ""}</p>
      <p className="mt-1 text-[13px] text-ink/80">시간은 한정돼 있으니, 어디에 쓸지가 곧 학점이에요.</p>

      <h2 className="mt-4 text-xs font-semibold text-brand">오늘 쓸 수 있는 시간</h2>
      <div role="group" aria-label="오늘 쓸 수 있는 시간" className="mt-2 flex gap-2">
        {HOUR_CHIPS.map((h) => (
          <button
            key={h}
            type="button"
            aria-pressed={available === h}
            onClick={() => setAvailable(h)}
            className={`h-11 flex-1 rounded-full text-sm font-semibold ${
              available === h ? "bg-brand text-white" : "border border-line bg-surface text-ink"
            }`}
          >
            {h}시간
          </button>
        ))}
      </div>

      {today && main && (
        <div className="mt-4 rounded-block bg-brand p-4 text-white">
          <p className="text-xs font-semibold text-white/80">오늘 가장 효율 좋은 {available}시간</p>
          <div className="mt-3 border-t border-white/20 pt-3">
            <p className="text-xs font-semibold text-white/80">{main.task.course}</p>
            <p className="mt-0.5 text-[20px] font-bold leading-snug">{main.task.title}</p>
            <p className="mt-1 font-mono text-xs text-white/80">{meta(main.task)}</p>
            <p className="mt-2 text-[13px] leading-relaxed">{main.task.reason}</p>
            {main.hours < main.task.hours && (
              <p className="mt-1 text-xs text-white/80">
                오늘은 {formatHours(main.hours)}만 하고 나머지는 다음에 이어서 해요.
              </p>
            )}
            {more.map((p) => (
              <p key={p.task.id} className="mt-2 text-[13px]">
                + {p.task.course} · {p.task.title} ({formatHours(p.hours)})
              </p>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/20 pt-3">
            <p className="text-[13px]">
              {plan.used === available
                ? `${available}시간을 모두 써요`
                : `${formatHours(plan.used)} 쓰고 ${formatHours(available - plan.used)}이 남아요`}
            </p>
            <Link
              href="/focus"
              className="flex min-h-11 shrink-0 items-center gap-1 rounded-button bg-surface px-3 text-[13px] font-semibold text-brand"
            >
              <Timer size={16} strokeWidth={1.8} aria-hidden="true" />
              집중 시작
            </Link>
          </div>
          {plan.deferred && (
            <div className="mt-3 rounded-button bg-white/10 p-3">
              <p className="text-xs font-semibold text-white/80">오늘 미루는 일</p>
              <p className="mt-1 text-[13px] leading-relaxed">
                {plan.deferred.course} {plan.deferred.title} ({formatHours(plan.deferred.hours)} 필요)이 오늘 미루는 일 중
                효율이 가장 높아요.
              </p>
            </div>
          )}
        </div>
      )}

      {today && !main && (
        <Block className="mt-4">
          <p className="text-[15px] font-bold">남은 일정이 없어요</p>
          <p className="mt-1 text-[13px] text-muted">강의계획서를 넣으면 마감 전 할 일 중에서 골라 드려요.</p>
          <Link href="/calendar" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand">
            강의계획서 넣기 <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </Block>
      )}

      {scored.length > 0 && (
        <>
          <div className="mt-6 flex items-baseline justify-between px-1">
            <h2 className="text-[17px] font-bold">후보 {Math.min(scored.length, MAX_CANDIDATES)}개</h2>
            <span className="text-xs text-muted">효율 높은 순</span>
          </div>
          <ul className="mt-2 space-y-2">
            {scored.slice(0, MAX_CANDIDATES).map((t, i) => (
              <li key={t.id}>
                <Block>
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-[15px] font-bold">
                      {t.course} · {t.title}
                    </p>
                    <div className="flex shrink-0 gap-1">
                      {pickedIds.has(t.id) && badge("bg-brand text-white", "오늘 추천")}
                      {badge(LEVEL_CLASS[t.level], `효율 ${t.level}`)}
                    </div>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted">{meta(t)}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-divider">
                    <div
                      className={`h-full rounded-full ${i === 0 ? "bg-brand" : "bg-[#A89BB0]"}`}
                      style={{ width: `${top > 0 ? Math.max((t.efficiency / top) * 100, 4) : 0}%` }}
                    />
                  </div>
                </Block>
              </li>
            ))}
          </ul>
        </>
      )}

      <Link
        href="/grades"
        className="mt-4 flex min-h-11 w-full items-center justify-between rounded-button border border-brand bg-surface px-4 text-sm font-semibold text-brand active:bg-brand-soft"
      >
        목표 점수까지 몇 점 필요한지 보기
        <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
      </Link>

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        효율 = 배점 × (목표 − 예상 득점률) ÷ 예상 소요시간이고, 마감이 3일 안이면 ×1.3, 7일 안이면 ×1.15를 곱해요. 배점은
        강의계획서의 평가 비율을 같은 종류 일정 수로 나눈 값이고, 없으면 중간·기말 30, 과제 10, 퀴즈·기타 5로 잡아요. 예상
        득점률은 시험 대비 팩의 퀴즈 정답률이나 0.6, 목표는 기말 필요 점수에서 정한 점수나 90점이에요. 예상 소요시간은 시험
        8시간, 과제 3시간, 퀴즈·기타 1시간이에요. 이 값은 순서를 정하는 데만 쓰고 점수를 예측하지는 않아요.
        {isExample && " 화면의 숫자는 모두 예시 데이터예요."}
      </p>
    </AppShell>
  );
}
