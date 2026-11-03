"use client";

import Link from "next/link";
import { ChevronRight, Settings } from "lucide-react";
import { useState } from "react";
import BottomSheet from "@/components/ui/bottom-sheet";
import { useToday } from "@/lib/briefing";
import { formatKoreanDate } from "@/lib/day-plan";
import DataBackup from "./data-backup";

// 홈 머리: '오늘' + 날짜, 오른쪽 설정 버튼. 설정 창에는 시간표 바꾸기와 데이터 내보내기·가져오기가 있다.
export default function HomeHeader() {
  const today = useToday();
  const [open, setOpen] = useState(false);

  return (
    <header className="mb-4 flex items-end justify-between px-1">
      <div>
        <p className="text-xs font-medium text-muted">오늘</p>
        <h1 className="min-h-8 text-[22px] font-bold">{today ? formatKoreanDate(today) : ""}</h1>
      </div>
      <button
        type="button"
        aria-label="설정"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink active:bg-divider"
      >
        <Settings size={20} strokeWidth={1.8} aria-hidden="true" />
      </button>

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
