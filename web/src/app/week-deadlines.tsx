"use client";

import Link from "next/link";
import { addDays, dDayLabel, daysUntil, useToday } from "@/lib/briefing";
import { useSavedDeadlines } from "@/lib/deadline-store";
import { formatDate } from "@/lib/syllabus";

// 캘린더에 저장한 일정 중 오늘부터 7일 안의 마감.
export default function WeekDeadlines() {
  const today = useToday();
  const saved = useSavedDeadlines();

  if (!today) return null;

  const weekEnd = addDays(today, 7);
  const thisWeek = saved.filter((d) => d.date >= today && d.date <= weekEnd);
  const later = saved.find((d) => d.date > weekEnd);

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">이번 주 마감</h2>
        <Link href="/calendar" className="text-xs text-foreground/50">
          일정 추가
        </Link>
      </div>

      {saved.length === 0 ? (
        <Link
          href="/calendar"
          className="mt-3 block rounded-2xl border-2 border-dashed border-accent/40 bg-accent-soft/40 px-5 py-6 text-center"
        >
          <span className="text-sm font-semibold">강의계획서 올리기</span>
          <span className="mt-1 block text-xs text-foreground/60">
            한 장이면 한 학기 마감이 여기에 모여요
          </span>
        </Link>
      ) : thisWeek.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-foreground/[0.04] px-4 py-4 text-sm text-foreground/70">
          이번 주 마감은 없어요.
          {later && ` 다음은 ${formatDate(later.date)} ${later.title} (${dDayLabel(daysUntil(today, later.date))})예요.`}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {thisWeek.map((d) => {
            const days = daysUntil(today, d.date);
            return (
              <li
                key={d.id}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  days === 0 ? "border-accent bg-accent-soft/50" : "border-foreground/10 bg-foreground/[0.02]"
                }`}
              >
                <span
                  className={`w-14 shrink-0 text-center text-sm font-bold ${
                    days <= 1 ? "text-accent" : "text-foreground/70"
                  }`}
                >
                  {dDayLabel(days)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{d.title}</p>
                  <p className="truncate text-xs text-foreground/60">
                    {[d.kind, d.course, formatDate(d.date)].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
