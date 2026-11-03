"use client";

import Link from "next/link";
import { ChevronRight, FileUp, Settings } from "lucide-react";
import { useState } from "react";
import BottomSheet from "@/components/ui/bottom-sheet";
import { useToday } from "@/lib/briefing";
import { formatKoreanDate } from "@/lib/day-plan";
import DataBackup from "./data-backup";

// 홈 머리: '오늘' + 날짜, 오른쪽 강의계획서 넣기·설정 버튼. 설정 창에는 시간표 바꾸기와 데이터 내보내기·가져오기가 있다.
export default function HomeHeader() {
  const today = useToday();
  const [open, setOpen] = useState(false);

  return (
    <header className="mb-4 flex items-end justify-between gap-2 px-1">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">오늘</p>
        <h1 className="min-h-8 text-[22px] font-bold leading-tight">{today ? formatKoreanDate(today) : ""}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Link
          href="/calendar"
          className="flex h-11 items-center gap-1 rounded-full bg-surface px-3 text-[13px] font-semibold whitespace-nowrap text-brand active:bg-divider"
        >
          <FileUp size={16} strokeWidth={1.8} aria-hidden="true" />
          강의계획서 넣기
        </Link>
        <button
          type="button"
          aria-label="설정"
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink active:bg-divider"
        >
          <Settings size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="설정">
        <Link
          href="/timetable"
          className="flex min-h-11 items-center justify-between rounded-button bg-canvas px-4 text-[15px] font-semibold"
        >
          시간표 보기·다시 올리기
          <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
        </Link>
        {/* 팀원(B) 부품. 모양은 B가 새 디자인으로 옮길 예정 */}
        <DataBackup />
      </BottomSheet>
    </header>
  );
}
