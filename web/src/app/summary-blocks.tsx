"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { addDays, useNowMinutes, useToday } from "@/lib/briefing";
import { findNextClass, formatUntil, pickCandidates, dDay, toMinutes, weekdayOf } from "@/lib/day-plan";
import { useSavedDeadlines } from "@/lib/deadline-store";
import { useTimetable } from "@/lib/timetable-store";

function SummaryLink({ href, filled = false, children }: { href: string; filled?: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex h-[92px] min-w-0 flex-col justify-between rounded-block-sm p-3 ${
        filled ? "bg-brand text-white active:bg-brand-strong" : "bg-surface text-ink active:bg-divider"
      }`}
    >
      {children}
    </Link>
  );
}

// 홈 맨 위 요약 3칸: 다음 수업(포인트색) · 이번 주 마감 · 기말고사. 누르면 해당 화면으로 간다.
export default function SummaryBlocks() {
  const today = useToday();
  const now = useNowMinutes();
  const timetable = useTimetable();
  const deadlines = useSavedDeadlines();

  if (!today || now === null) return <div className="h-[92px]" />;

  const next = findNextClass(today, now, timetable);
  const thisWeek = pickCandidates(today, deadlines).filter((d) => d.date <= addDays(today, 6));
  const finals = deadlines
    .filter((d) => d.kind === "기말" && !d.done && d.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  let nextWhen = "";
  if (next) {
    if (next.offset === 0) nextWhen = `${next.slot.start} · ${formatUntil(toMinutes(next.slot.start!) - now)}`;
    else if (next.offset === 1) nextWhen = `내일 ${next.slot.start}`;
    else nextWhen = `${weekdayOf(next.date)} ${next.slot.start}`;
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <SummaryLink href="/timetable" filled>
        <span className="text-[11px] font-medium opacity-80">다음 수업</span>
        {next ? (
          <>
            <span className="truncate text-[17px] font-bold">{next.slot.course}</span>
            <span className="truncate font-mono text-[11px]">{nextWhen}</span>
          </>
        ) : (
          <>
            <span className="text-[15px] font-bold leading-tight">시간표 올리기</span>
            <span className="text-xs opacity-80">KLAS 캡쳐 →</span>
          </>
        )}
      </SummaryLink>

      <SummaryLink href="/calendar">
        <span className="text-[11px] font-medium text-muted">이번 주 마감</span>
        {thisWeek.length > 0 ? (
          <>
            <span className="font-mono text-[19px] font-semibold text-brand">{dDay(today, thisWeek[0].date)}</span>
            <span className="truncate text-xs text-muted">
              {thisWeek[0].title}
              {thisWeek.length > 1 && ` 외 ${thisWeek.length - 1}건`}
            </span>
          </>
        ) : (
          <>
            <span className="text-[17px] font-bold text-muted">없음</span>
            <span className="truncate text-xs text-muted">이번 주는 여유</span>
          </>
        )}
      </SummaryLink>

      <SummaryLink href="/exam">
        <span className="text-[11px] font-medium text-muted">기말고사</span>
        <span className="font-mono text-[19px] font-semibold">{finals ? dDay(today, finals.date) : "–"}</span>
        <span className="text-xs font-semibold text-brand">시험 대비 →</span>
      </SummaryLink>
    </div>
  );
}
