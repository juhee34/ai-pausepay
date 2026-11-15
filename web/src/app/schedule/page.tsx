"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight, Cookie, FileUp, Map as MapIcon, Plus, type LucideIcon } from "lucide-react";
import { useState } from "react";
import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";
import ScreenHeader, { HEADER_ADD_BUTTON_CLASS } from "@/components/ui/screen-header";
import SavedList from "../calendar/saved-list";
import DayPlan from "../day-plan";
import TaskFormSheet from "../task-form-sheet";

// 일정을 넣는 길과 일정에서 이어지는 화면. cookie: AI를 써서 무료 횟수 뒤에 쿠키가 필요한 기능.
const LINKS: { href: string; label: string; sub: string; Icon: LucideIcon; cookie?: boolean }[] = [
  { href: "/calendar", label: "강의계획서 올리기", sub: "시험·과제 날짜를 찾아 달력에 넣어요", Icon: FileUp, cookie: true },
  { href: "/timetable", label: "시간표 올리기", sub: "KLAS 캡쳐로 수업 시간을 넣어요", Icon: CalendarClock, cookie: true },
  { href: "/risk", label: "학기 리스크 지도", sub: "할 일이 몰리는 주를 미리 봐요", Icon: MapIcon },
];

// 일정 탭: 큰 달력, 고른 날의 일정, 저장한 일정 목록, 일정을 넣는 길.
// 예전에는 홈에 있던 것을 옮겨 왔다. 오늘 탭에는 오늘 일정만 남는다.
export default function SchedulePage() {
  const [adding, setAdding] = useState(false);

  return (
    <AppShell>
      <ScreenHeader
        title="일정"
        sub="시험·과제·대외활동을 달력에서 한눈에 봐요."
        actions={
          <button type="button" aria-label="할 일 직접 넣기" onClick={() => setAdding(true)} className={HEADER_ADD_BUTTON_CLASS}>
            <Plus size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        }
      />

      <DayPlan />
      <SavedList />

      <h2 className="mt-6 mb-2 px-1 text-[15px] font-bold">일정 넣기</h2>
      <Block padded={false} className="divide-y divide-divider overflow-hidden">
        {LINKS.map(({ href, label, sub, Icon, cookie }) => (
          <Link key={href} href={href} className="flex min-h-14 items-center gap-3 px-4 py-2.5 active:bg-divider">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand">
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">
                {label}
                {cookie && (
                  <>
                    <Cookie size={13} strokeWidth={2} aria-hidden="true" className="ml-1 inline-block align-[-1px] text-brand" />
                    <span className="sr-only">무료 횟수 뒤에 쿠키 필요</span>
                  </>
                )}
              </span>
              <span className="mt-0.5 block text-xs text-muted">{sub}</span>
            </span>
            <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted/60" />
          </Link>
        ))}
      </Block>

      {adding && <TaskFormSheet onClose={() => setAdding(false)} />}
    </AppShell>
  );
}
