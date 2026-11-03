import { addDays } from "@/lib/briefing";

const DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"];

// 날짜는 "YYYY-MM-DD" 글자로 주고받는다. 월~일 한 줄. 오늘은 포인트색 원, 고른 날은 옅은 포인트, 일정 있는 날은 숫자 아래 점.
export default function WeekStrip({
  weekStart,
  today,
  selected,
  markedDates = [],
  onSelect,
}: {
  weekStart: string; // 그 주 월요일
  today: string;
  selected?: string;
  markedDates?: string[];
  onSelect?: (date: string) => void;
}) {
  const days = DAY_NAMES.map((name, i) => ({ name, date: addDays(weekStart, i) }));

  return (
    <div className="flex">
      {days.map(({ name, date }) => {
        const isToday = date === today;
        const isSelected = date === selected;
        return (
          <button
            key={date}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${Number(date.slice(5, 7))}월 ${Number(date.slice(8))}일 ${name}요일`}
            onClick={() => onSelect?.(date)}
            className="flex min-h-11 flex-1 flex-col items-center gap-1 py-1"
          >
            <span className={`text-[11px] font-medium ${isToday ? "text-brand" : "text-muted"}`}>{name}</span>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-semibold ${
                isToday ? "bg-brand text-white" : isSelected ? "bg-brand-soft text-brand" : "text-ink"
              }`}
            >
              {Number(date.slice(8))}
            </span>
            <span
              aria-hidden="true"
              className={`h-1 w-1 rounded-full ${markedDates.includes(date) ? "bg-muted" : "bg-transparent"}`}
            />
          </button>
        );
      })}
    </div>
  );
}
