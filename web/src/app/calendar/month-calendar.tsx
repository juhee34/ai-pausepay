"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Block from "@/components/ui/block";
import { addDays } from "@/lib/briefing";
import type { DeadlineKind } from "@/lib/syllabus";

export type DotKind = DeadlineKind | "확인 필요";

const DOT_CLASS: Record<DotKind, string> = {
  과제: "bg-assignment",
  퀴즈: "bg-quiz-dot",
  중간: "bg-brand",
  기말: "bg-brand",
  기타: "bg-muted",
  "확인 필요": "bg-review-dot",
};

const LEGEND: { label: string; className: string }[] = [
  { label: "퀴즈", className: "bg-quiz-dot" },
  { label: "과제", className: "bg-assignment" },
  { label: "시험", className: "bg-brand" },
  { label: "기타", className: "bg-muted" },
];
const REVIEW_LEGEND = { label: "확인 필요", className: "bg-review-dot" };

// "YYYY-MM" 달을 앞뒤로 옮긴다.
export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 한 달 달력 블록. 오늘은 포인트색 테두리 원, 일정 있는 날은 숫자 아래 종류별 색 점(최대 3개).
// selected를 주면(홈) 모든 날을 고를 수 있고 고른 날을 표시한다. 없으면 일정 있는 날만 누를 수 있다.
export default function MonthCalendar({
  month,
  today,
  marks,
  selected,
  onMonthChange,
  onSelectDate,
}: {
  month: string; // YYYY-MM
  today: string;
  marks: { date: string; kind: DotKind }[];
  selected?: string;
  onMonthChange: (month: string) => void;
  onSelectDate?: (date: string) => void;
}) {
  const legend = marks.some((mk) => mk.kind === "확인 필요") ? [...LEGEND, REVIEW_LEGEND] : LEGEND;
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const startOffset = new Date(y, m - 1, 1).getDay(); // 일요일 시작
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i)),
  ];

  const dotsOf = (date: string) => {
    const kinds = [...new Set(marks.filter((mk) => mk.date === date).map((mk) => mk.kind))];
    return kinds.slice(0, 3);
  };

  return (
    <Block padded={false}>
      <div className="flex items-center justify-between px-2 pt-2">
        <button
          type="button"
          aria-label="이전 달"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted active:bg-canvas"
        >
          <ChevronLeft size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <h2 className="text-[15px] font-bold">
          {y}년 {m}월
        </h2>
        <button
          type="button"
          aria-label="다음 달"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted active:bg-canvas"
        >
          <ChevronRight size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 px-2 pb-2 text-center">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <span key={d} className="py-1 text-[11px] font-medium text-muted">
            {d}
          </span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`empty-${i}`} />;
          const dots = dotsOf(date);
          const isToday = date === today;
          const isSelected = date === selected;
          return (
            <button
              key={date}
              type="button"
              disabled={selected === undefined && dots.length === 0}
              aria-pressed={selected === undefined ? undefined : isSelected}
              aria-label={`${m}월 ${Number(date.slice(8))}일${dots.length ? ` 일정 ${dots.join("·")}` : ""}`}
              onClick={() => onSelectDate?.(date)}
              className="flex min-h-11 flex-col items-center justify-center gap-0.5"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-[13px] font-medium ${
                  isToday ? "border-[1.5px] border-brand font-semibold text-brand" : "text-ink"
                } ${isSelected ? "bg-brand-soft font-semibold text-brand" : ""}`}
              >
                {Number(date.slice(8))}
              </span>
              <span className="flex h-1 gap-0.5" aria-hidden="true">
                {dots.map((kind) => (
                  <span key={kind} className={`h-1 w-1 rounded-full ${DOT_CLASS[kind]}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-divider px-3.5 py-2.5">
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-1 text-[11px] text-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${l.className}`} aria-hidden="true" />
            {l.label}
          </span>
        ))}
      </div>
    </Block>
  );
}
