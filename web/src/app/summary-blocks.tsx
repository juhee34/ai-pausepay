"use client";

import { CalendarClock, ChevronRight, Clock, GraduationCap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import Block from "@/components/ui/block";
import { addDays, useNowMinutes, useToday } from "@/lib/briefing";
import { findNextClass, pickCandidates, dDay, toMinutes, weekdayOf } from "@/lib/day-plan";
import { useSavedDeadlines } from "@/lib/deadline-store";
import { useTimetable } from "@/lib/timetable-store";

// 다음 수업까지 남은 시간. 60분부터는 시간으로 반올림한다.
function untilText(minutes: number) {
  return minutes < 60 ? `${minutes}분 후` : `${Math.round(minutes / 60)}시간 후`;
}

// 한 줄: 왼쪽 아이콘 칩 + 이름과 설명 두 줄 + 오른쪽 값(시각·D-day) + 화살표. '과목별 할 일' 목록과 같은 모양이다.
function Row({
  href,
  Icon,
  chip,
  label,
  sub,
  value,
  strong = false,
}: {
  href: string;
  Icon: LucideIcon;
  chip: string; // 아이콘 칩의 바탕·글자색
  label: string;
  sub: ReactNode;
  value?: string;
  strong?: boolean; // 값을 포인트색으로
}) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 px-4 py-2.5 active:bg-divider">
      <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${chip}`}>
        <Icon size={18} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px]">{label}</span>
        <span className="mt-px block truncate text-[13px] text-muted">{sub}</span>
      </span>
      {value && (
        <span className={`shrink-0 font-mono text-[15px] font-semibold ${strong ? "text-brand" : "text-ink/80"}`}>
          {value}
        </span>
      )}
      <ChevronRight size={18} strokeWidth={2} aria-hidden="true" className="shrink-0 text-muted/50" />
    </Link>
  );
}

// 오늘 화면의 '다가오는 일정' 3줄: 다음 수업 · 이번 주 마감 · 기말고사. 누르면 해당 화면으로 간다.
export default function SummaryBlocks() {
  const today = useToday();
  const now = useNowMinutes();
  const timetable = useTimetable();
  const deadlines = useSavedDeadlines();

  if (!today || now === null) return <div className="h-[168px]" />;

  const next = findNextClass(today, now, timetable);
  const thisWeek = pickCandidates(today, deadlines).filter((d) => d.date <= addDays(today, 6));
  const finals = deadlines
    .filter((d) => d.kind === "기말" && !d.done && d.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  let nextWhen = "";
  if (next) {
    if (next.offset === 0) nextWhen = untilText(toMinutes(next.slot.start!) - now);
    else if (next.offset === 1) nextWhen = `내일 ${next.slot.start}`;
    else nextWhen = `${weekdayOf(next.date)} ${next.slot.start}`;
  }

  return (
    <Block padded={false} className="divide-y divide-divider overflow-hidden">
      <Row
        href="/timetable"
        Icon={Clock}
        chip="bg-brand-soft text-brand"
        label="다음 수업"
        sub={
          next
            ? next.offset === 0
              ? `${next.slot.course} · ${next.slot.start}`
              : next.slot.course
            : "시간표를 올리면 다음 수업을 알려 드려요"
        }
        value={next ? nextWhen : undefined}
        strong={next?.offset === 0}
      />
      <Row
        href="/schedule#saved-deadlines"
        Icon={CalendarClock}
        chip="bg-assignment-soft text-assignment"
        label="이번 주 마감"
        sub={
          thisWeek.length > 0
            ? `${thisWeek[0].title}${thisWeek.length > 1 ? ` 외 ${thisWeek.length - 1}건` : ""}`
            : "이번 주는 마감이 없어요"
        }
        value={thisWeek.length > 0 ? dDay(today, thisWeek[0].date) : undefined}
        strong
      />
      <Row
        href="/exam"
        Icon={GraduationCap}
        chip="bg-review-soft text-review"
        label="기말고사"
        sub={finals ? `${finals.course} · 시험 대비로 준비하기` : "시험 대비로 요약과 문제 만들기"}
        value={finals ? dDay(today, finals.date) : undefined}
      />
    </Block>
  );
}
