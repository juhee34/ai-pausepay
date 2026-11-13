"use client";

import { Noto_Serif } from "next/font/google";
import Link from "next/link";
import { ChevronRight, FileUp, Menu, Plus } from "lucide-react";
import { useState } from "react";
import BottomSheet from "@/components/ui/bottom-sheet";
import DataBackup from "./data-backup";
import TaskFormSheet from "./task-form-sheet";
import VoiceCall from "./voice-call";

// 로고 전용 글꼴. 다른 글자에는 쓰지 않는다 (docs/DESIGN.md)
const logoFont = Noto_Serif({ subsets: ["latin"], weight: "700", style: "italic" });

// 홈 머리: UNIS 로고(누르면 음성 안내), 오른쪽 메뉴 버튼. 메뉴 창에는 강의계획서 넣기, 할 일 직접 넣기, 시간표 바꾸기, 데이터 내보내기·가져오기가 있다.
export default function HomeHeader() {
  const [open, setOpen] = useState(false);
  const [addingTask, setAddingTask] = useState(false);

  return (
    <header className="mb-4 flex items-center justify-between gap-2 px-1">
      {/* 버튼 안에는 제목(h1)을 넣을 수 없어서 화면 제목은 화면 읽기용으로 따로 둔다. */}
      <h1 className="sr-only">UNIS 홈</h1>
      {/* 로고를 누르면 우니스가 이름을 부르고 오늘 할 일을 말로 추천한다 (voice-call.tsx) */}
      <VoiceCall className={logoFont.className}>
        <span className="block text-[11px] leading-none text-muted">
          <span className="text-brand">UNI</span>fied <span className="text-brand">S</span>tudent
        </span>
        <span className="mt-1 block text-[28px] leading-none text-ink">
          UNIS
          <span aria-hidden="true" className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-brand motion-safe:animate-pulse" />
        </span>
      </VoiceCall>
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
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setAddingTask(true);
          }}
          className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-button bg-canvas px-4 text-[15px] font-semibold"
        >
          <Plus size={18} strokeWidth={1.8} aria-hidden="true" />
          할 일 직접 넣기
          <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" className="ml-auto" />
        </button>
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
      {addingTask && <TaskFormSheet onClose={() => setAddingTask(false)} />}
    </header>
  );
}
