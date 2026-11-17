"use client";

import Link from "next/link";
import { ArrowRight, CalendarPlus, Clock3, FileUp, Plus } from "lucide-react";
import { useState } from "react";
import { addDays, useNowMinutes, useToday } from "@/lib/briefing";
import { findNextClass, formatUntil, dDay, toMinutes, weekdayOf } from "@/lib/day-plan";
import { useSavedDeadlines } from "@/lib/deadline-store";
import { useTimetable } from "@/lib/timetable-store";
import TaskFormSheet from "./task-form-sheet";

export default function SummaryBlocks() {
  const today = useToday();
  const now = useNowMinutes();
  const timetable = useTimetable();
  const deadlines = useSavedDeadlines();
  const [adding, setAdding] = useState(false);
  if (!today || now === null) return <div className="h-64 rounded-block bg-surface" aria-label="오늘의 일정 불러오는 중" />;
  const next = findNextClass(today, now, timetable);
  const upcoming = deadlines.filter(d => !d.done && d.date >= today && d.date <= addDays(today, 6)).sort((a, b) => a.date.localeCompare(b.date));
  const finals = deadlines.filter(d => d.kind === "기말" && !d.done && d.date >= today).sort((a,b) => a.date.localeCompare(b.date))[0];
  const empty = timetable.length === 0 && deadlines.length === 0;
  const nextWhen = next ? next.offset === 0 ? `${next.slot.start} · ${formatUntil(toMinutes(next.slot.start!) - now)}` : `${next.offset === 1 ? "내일" : weekdayOf(next.date)} ${next.slot.start}` : "";
  return <section id="home-overview" aria-label="오늘의 브리핑" className="mb-5">
    <div className="mb-5 px-1">
      <p className="font-mono text-[11px] tracking-wide text-muted">{today.replaceAll("-", ".")} · {weekdayOf(today)}요일</p>
      <h2 className="mt-2 text-[28px] leading-snug font-semibold tracking-[-0.04em]">{empty ? <>나의 대학 생활,<br />여기서 시작해요.</> : <>오늘도, 하나씩.<br /><span className="text-muted">내 하루를 살펴볼까요?</span></>}</h2>
    </div>
    {empty ? <div className="rounded-block bg-brand p-5 text-white">
      <div className="flex items-center justify-between"><span className="text-xs font-medium opacity-80">첫 번째 할 일</span><FileUp size={22} strokeWidth={1.5} aria-hidden="true" /></div>
      <h3 className="mt-4 text-[21px] font-semibold tracking-tight">강의계획서 한 장이면 돼요.</h3>
      <p className="mt-2 text-[13px] leading-6 text-white/80">AI가 찾은 과제·시험 날짜를 확인하고<br />나만의 학기 달력을 만들어 보세요.</p>
      <Link href="/calendar" className="mt-5 flex min-h-12 items-center justify-between rounded-button bg-white px-4 text-sm font-semibold text-brand">강의계획서로 일정 추가<ArrowRight size={18} aria-hidden="true" /></Link>
      <button onClick={() => setAdding(true)} className="mt-1 flex min-h-11 w-full items-center justify-center gap-1 text-xs text-white/90"><Plus size={14} aria-hidden="true" />파일 없이 직접 입력하기</button>
    </div> : <Link href={next ? "/timetable" : "/today"} className="block rounded-block bg-brand p-5 text-white">
      <div className="flex items-center justify-between text-xs text-white/80"><span>{next ? "다음 수업" : "오늘의 한 가지"}</span><Clock3 size={18} strokeWidth={1.5} aria-hidden="true" /></div>
      <h3 className="mt-3 text-[23px] leading-snug font-semibold tracking-tight">{next ? next.slot.course : "지금 할 일부터 정해요"}</h3>
      <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-white/80">{next ? nextWhen : "쓸 수 있는 시간에 맞춰 공부 계획하기"}</span><ArrowRight size={18} aria-hidden="true" /></div>
    </Link>}
    {!empty && <div className="mt-2.5 grid grid-cols-2 gap-2.5">
      <Link href={deadlines.length ? "/#saved-deadlines" : "/calendar"} className="rounded-block-sm bg-surface p-4">
        <p className="text-xs text-muted">앞으로 7일 마감</p><p className="mt-2 font-mono text-[26px] font-semibold">{upcoming.length}<span className="ml-1 font-sans text-xs font-normal text-muted">건</span></p>
        <p className="mt-1 text-xs leading-5 text-muted">{upcoming.length ? `${dDay(today, upcoming[0].date)} · ${upcoming[0].title}` : deadlines.length ? "등록된 마감이 없어요" : "일정을 추가해 주세요"}</p>
      </Link>
      <Link href={finals ? "/exam" : "/calendar"} className="rounded-block-sm bg-surface p-4"><p className="text-xs text-muted">가장 가까운 기말</p><p className="mt-2 font-mono text-[26px] font-semibold">{finals ? dDay(today, finals.date) : "—"}</p><p className="mt-1 text-xs leading-5 text-muted">{finals ? `${finals.course} · 시험 대비 →` : "시험 일정을 등록해 주세요"}</p></Link>
    </div>}
    <div className="mt-3 flex items-center gap-2">
      {!empty && <Link href="/calendar" className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-button bg-surface px-2 text-xs font-semibold"><CalendarPlus size={16} aria-hidden="true" />일정 추가</Link>}
      <Link href="/calendar?type=posting" className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-button bg-surface px-2 text-xs font-semibold"><CalendarPlus size={16} aria-hidden="true" />공고·자격증 일정 추가<ArrowRight size={14} aria-hidden="true" /></Link>
    </div>
    {adding && <TaskFormSheet onClose={() => setAdding(false)} />}
  </section>;
}
