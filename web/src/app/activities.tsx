"use client";

import { X } from "lucide-react";
import { useState } from "react";
import Button from "@/components/ui/button";
import {
  MAX_ACTIVITY_TITLE,
  addActivity,
  removeActivity,
  useActivities,
} from "@/lib/activity-store";
import { useToday } from "@/lib/briefing";
import { dDay, formatKoreanDate } from "@/lib/day-plan";

const INPUT = "min-h-11 w-full rounded-button border border-line bg-surface px-3 text-[15px] text-ink";

// 동아리·공모전처럼 강의계획서에 없는 일정을 직접 적는 곳. 홈의 '+ 대외활동' 창 안에 들어간다.
// 적은 일정은 홈의 그날 목록에 같이 보인다. 지난 일정은 숨긴다.
export default function Activities() {
  const today = useToday();
  const activities = useActivities();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  if (!today) return null;

  const upcoming = activities.filter((a) => a.date >= today);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    addActivity(title, date);
    setTitle("");
    setDate("");
  }

  return (
    <div>
      <form onSubmit={submit} className="space-y-2">
        <input
          aria-label="활동 이름"
          placeholder="예: 동아리 정기 회의"
          value={title}
          maxLength={MAX_ACTIVITY_TITLE}
          onChange={(e) => setTitle(e.target.value)}
          className={INPUT}
        />
        <input
          type="date"
          aria-label="날짜"
          value={date}
          min={today}
          onChange={(e) => setDate(e.target.value)}
          className={INPUT}
        />
        <Button type="submit" className="w-full" disabled={!title.trim() || !date}>
          추가
        </Button>
      </form>

      {upcoming.length > 0 && (
        <ul className="mt-4 divide-y divide-divider border-t border-divider">
          {upcoming.map((a) => (
            <li key={a.id} className="flex min-h-11 items-center gap-3 py-2">
              <span className="w-12 shrink-0 font-mono text-[13px] font-semibold text-brand">{dDay(today, a.date)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{a.title}</p>
                <p className="text-xs text-muted">{formatKoreanDate(a.date)}</p>
              </div>
              <button
                type="button"
                aria-label={`${a.title} 지우기`}
                onClick={() => removeActivity(a.id)}
                className="flex h-11 w-11 shrink-0 items-center justify-center text-muted"
              >
                <X size={18} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
