"use client";

import { CalendarPlus, X } from "lucide-react";
import { useState } from "react";
import Badge from "@/components/ui/badge";
import Block from "@/components/ui/block";
import Button from "@/components/ui/button";
import CheckRow from "@/components/ui/check-row";
import { useToday } from "@/lib/briefing";
import { downloadCalendarFile } from "@/lib/calendar-file";
import { BADGE_OF } from "@/lib/day-plan";
import { removeDeadline, useSavedDeadlines } from "@/lib/deadline-store";
import { shortDate } from "./review-list";

// 홈에 보이는 저장된 일정 전체: 목록, 지우기, 캘린더 파일(.ics) 다시 받기.
export default function SavedList() {
  const today = useToday();
  const saved = useSavedDeadlines();
  const [showPast, setShowPast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!today || saved.length === 0) return null;

  const upcoming = saved.filter((d) => d.date >= today);
  const past = saved.filter((d) => d.date < today);

  function download() {
    try {
      setError(null);
      downloadCalendarFile(saved);
    } catch {
      setError("캘린더 파일을 만들지 못했어요. 다시 해 주세요.");
    }
  }

  const row = (d: (typeof saved)[number]) => {
    const badge = BADGE_OF[d.kind];
    return (
      <div key={d.id}>
        <CheckRow
          time={shortDate(d.date)}
          title={d.title}
          sub={d.course}
          past={d.date < today || d.done}
          right={
            <>
              {badge ? <Badge kind={badge}>{d.kind}</Badge> : <span className="text-[11px] text-muted">{d.kind}</span>}
              <button
                type="button"
                aria-label={`${d.title} 지우기`}
                onClick={() => removeDeadline(d.id)}
                className="-mr-2 flex h-11 w-9 shrink-0 items-center justify-center text-muted"
              >
                <X size={16} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </>
          }
        />
      </div>
    );
  };

  return (
    <section id="saved-deadlines" className="mt-6 scroll-mt-4">
      <div className="mb-2 px-1">
        <h2 className="text-[15px] font-bold">내 일정 {saved.length}개</h2>
        <p className="text-xs text-muted">이 폰 브라우저에만 저장돼요</p>
      </div>

      <Block padded={false} className="divide-y divide-divider">
        {past.length > 0 && (
          <button
            type="button"
            aria-expanded={showPast}
            onClick={() => setShowPast((v) => !v)}
            className="flex min-h-11 w-full items-center px-3.5 text-left text-sm text-muted"
          >
            지난 일정 {past.length}개 {showPast ? "접기" : "보기"}
          </button>
        )}
        {showPast && past.map(row)}
        {upcoming.map(row)}
        {upcoming.length === 0 && <p className="px-3.5 py-4 text-sm text-muted">남은 일정이 없어요.</p>}
      </Block>

      <Button variant="secondary" className="mt-2.5 w-full !bg-surface" onClick={download}>
        <CalendarPlus size={18} strokeWidth={1.8} aria-hidden="true" />
        캘린더 파일(.ics) 다시 받기
      </Button>
      <p className="mt-2 px-1 text-xs leading-relaxed text-muted">
        파일을 열면 아이폰·구글 캘린더에 한 번에 들어가요. 일정 전날 오전 9시에 알림이 와요. 카톡 안에서 열었다면
        사파리나 크롬으로 다시 열어 주세요.
      </p>
      {error && (
        <p role="alert" className="mt-2 px-1 text-xs text-review">
          {error}
        </p>
      )}
    </section>
  );
}
