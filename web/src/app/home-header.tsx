"use client";

import Link from "next/link";
import { ChevronRight, FileUp, Menu } from "lucide-react";
import { useState } from "react";
import BottomSheet from "@/components/ui/bottom-sheet";
import DataBackup from "./data-backup";

// 홈 머리: UNIS 로고, 오른쪽 메뉴 버튼. 메뉴 창에는 강의계획서 넣기, 시간표 바꾸기, 데이터 내보내기·가져오기가 있다.
export default function HomeHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="mb-4 flex items-center justify-between gap-2 px-1">
      <h1 className="text-[28px] font-bold leading-none tracking-wide text-brand">UNIS</h1>
      <button
        type="button"
        aria-label="메뉴"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink active:bg-divider"
      >
        <Menu size={20} strokeWidth={1.8} aria-hidden="true" />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="메뉴">
        <Link
          href="/calendar"
          className="flex min-h-11 items-center gap-2 rounded-button bg-brand px-4 text-[15px] font-semibold text-white active:bg-brand-strong"
        >
          <FileUp size={18} strokeWidth={1.8} aria-hidden="true" />
          강의계획서 넣기
          <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" className="ml-auto" />
        </Link>
        <Link
          href="/timetable"
          className="mt-2 flex min-h-11 items-center justify-between rounded-button bg-canvas px-4 text-[15px] font-semibold"
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
