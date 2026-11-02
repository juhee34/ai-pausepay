"use client";

import { useState } from "react";
import { downloadCalendarFile } from "@/lib/calendar-file";
import { removeDeadline, useSavedDeadlines } from "@/lib/deadline-store";
import { formatDate } from "@/lib/syllabus";

// 이 기기에 저장된 일정 목록과 캘린더 파일(.ics) 내려받기.
export default function SavedList() {
  const saved = useSavedDeadlines();
  const [error, setError] = useState<string | null>(null);

  if (saved.length === 0) return null;

  function download() {
    try {
      setError(null);
      downloadCalendarFile(saved);
    } catch {
      setError("캘린더 파일을 만들지 못했어요. 다시 해 주세요.");
    }
  }

  return (
    <div className="mt-12">
      <h2 className="text-sm font-semibold">내 일정 {saved.length}개</h2>
      <p className="mt-1 text-xs text-foreground/50">이 폰 브라우저에만 저장돼요.</p>

      <ul className="mt-4 space-y-2">
        {saved.map((d) => (
          <li
            key={d.id}
            className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3"
          >
            <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
              {d.kind}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{d.title}</p>
              <p className="truncate text-xs text-foreground/60">
                {[d.course, formatDate(d.date)].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeDeadline(d.id)}
              className="shrink-0 px-1 text-xs text-foreground/40"
            >
              지우기
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={download}
        className="mt-5 w-full rounded-xl border border-accent px-5 py-3 text-sm font-semibold text-accent"
      >
        캘린더 파일(.ics) 내려받기
      </button>
      <p className="mt-2 text-xs leading-relaxed text-foreground/50">
        파일을 열면 아이폰·구글 캘린더에 한 번에 들어가요. 일정 전날 오전 9시에 알림이 와요.
        카톡 안에서 열었다면 사파리나 크롬으로 다시 열어 주세요.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
