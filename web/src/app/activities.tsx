"use client";

import { useState } from "react";
import {
  MAX_ACTIVITY_TITLE,
  addActivity,
  removeActivity,
  useActivities,
} from "@/lib/activity-store";
import { dDayLabel, daysUntil, useToday } from "@/lib/briefing";
import { formatDate } from "@/lib/syllabus";

// 동아리·공모전처럼 강의계획서에 없는 일정을 직접 적는 카드. 지난 일정은 숨긴다.
export default function Activities() {
  const today = useToday();
  const activities = useActivities();
  const [open, setOpen] = useState(false);
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
    setOpen(false);
  }

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">대외활동</h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-semibold text-accent"
        >
          {open ? "닫기" : "+ 추가"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={submit}
          className="mt-3 space-y-2 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"
        >
          <input
            aria-label="활동 이름"
            placeholder="예: 동아리 정기 회의"
            value={title}
            maxLength={MAX_ACTIVITY_TITLE}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm"
          />
          <input
            type="date"
            aria-label="날짜"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!title.trim() || !date}
            className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            저장
          </button>
        </form>
      )}

      {upcoming.length === 0 ? (
        !open && (
          <p className="mt-3 rounded-2xl bg-foreground/[0.04] px-4 py-4 text-sm text-foreground/70">
            동아리·공모전 일정을 적어 두면 브리핑에 같이 보여요.
          </p>
        )
      ) : (
        <ul className="mt-3 space-y-2">
          {upcoming.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3"
            >
              <span className="w-14 shrink-0 text-center text-sm font-bold text-foreground/70">
                {dDayLabel(daysUntil(today, a.date))}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{a.title}</p>
                <p className="text-xs text-foreground/60">{formatDate(a.date)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeActivity(a.id)}
                className="shrink-0 px-1 text-xs text-foreground/40"
              >
                지우기
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
