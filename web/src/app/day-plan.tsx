"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useState } from "react";
import Badge from "@/components/ui/badge";
import Block from "@/components/ui/block";
import BottomSheet from "@/components/ui/bottom-sheet";
import Button from "@/components/ui/button";
import CheckRow, { Checkbox } from "@/components/ui/check-row";
import { isHomeActivity, setActivityDone, useActivities } from "@/lib/activity-store";
import { useNowMinutes, useToday } from "@/lib/briefing";
import {
  BADGE_OF,
  buildDayPlan,
  dDay,
  formatDuration,
  freeMinutesUntilNextClass,
  pickCandidates,
  toMinutes,
  weekdayOf,
  type PlanItem,
} from "@/lib/day-plan";
import { setDeadlineDone, useSavedDeadlines, type SavedDeadline } from "@/lib/deadline-store";
import { useTimetable } from "@/lib/timetable-store";
import Activities from "./activities";
import MonthCalendar, { type DotKind } from "./calendar/month-calendar";
import { useTodayPick } from "./today-pick";

const MIN_FREE_MINUTES = 30;

function formatHm(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// 홈의 큰 달력 → 고른 날의 일정 목록. 강의계획서에서 저장한 일정이 달력에 바로 점으로 찍힌다.
// 오늘이면 현재 시각 선과 지금 할 일 추천이 끼어든다.
export default function DayPlan() {
  const today = useToday();
  const now = useNowMinutes();
  const timetable = useTimetable();
  const deadlines = useSavedDeadlines();
  const activities = useActivities().filter(isHomeActivity);
  const [picked, setPicked] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);

  if (!today || now === null) return <Block className="mt-2.5 min-h-64" />;

  const selected = picked ?? today;
  const isToday = selected === today;
  const { untimed, timed } = buildDayPlan(selected, timetable, deadlines, activities);
  const total = untimed.length + timed.length;

  const isPastClass = (end: string) => isToday && toMinutes(end) <= now;
  const isDone = (item: PlanItem) =>
    (item.type === "deadline" && Boolean(item.deadline.done)) ||
    (item.type === "activity" && Boolean(item.activity.done)) ||
    (item.type === "class" && isPastClass(item.slot.end));
  const doneCount = [...untimed, ...timed].filter(isDone).length;

  // 달력의 점: 마감·대외활동이 있는 날
  const marks: { date: string; kind: DotKind }[] = [
    ...deadlines.map((d) => ({ date: d.date, kind: d.kind })),
    ...activities.map((a) => ({ date: a.date, kind: "기타" as const })),
  ];

  // 현재 시각 선은 아직 시작하지 않은 첫 수업 앞에 둔다.
  const nowIndex = isToday ? timed.findIndex((c) => toMinutes(c.slot.start) > now) : -1;
  const nowAt = isToday ? (nowIndex === -1 ? timed.length : nowIndex) : -1;

  const nowLine = (
    <div key="now" className="flex items-center gap-2 px-3.5 py-1">
      <span className="h-px flex-1 bg-brand" />
      <span className="font-mono text-[11px] font-semibold text-brand">{formatHm(now)}</span>
    </div>
  );

  return (
    <>
    <div className="mt-2.5">
      <MonthCalendar
        month={month ?? today.slice(0, 7)}
        today={today}
        marks={marks}
        selected={selected}
        onMonthChange={setMonth}
        onSelectDate={setPicked}
      />
    </div>

    <Block padded={false} className="mt-2.5">
      <div className="flex min-h-11 items-center justify-between gap-2 px-3.5 pt-2">
        <h2 className="text-[15px] font-bold">
          {isToday ? (
            <>
              오늘 일정
              <span className="ml-1.5 font-mono text-xs font-medium text-muted">
                {Number(today.slice(5, 7))}/{Number(today.slice(8))} {weekdayOf(today)}
              </span>
            </>
          ) : (
            `${Number(selected.slice(5, 7))}/${Number(selected.slice(8))} ${weekdayOf(selected)}요일 일정`
          )}
        </h2>
        {!isToday ? (
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setMonth(null);
            }}
            className="-mr-1 min-h-11 shrink-0 px-1 text-xs font-semibold text-brand"
          >
            오늘 보기
          </button>
        ) : (
          total > 0 && <span className="text-xs text-muted">{`${total}개 중 ${doneCount}개 지남`}</span>
        )}
      </div>

      <div className="divide-y divide-divider">
        {untimed.map((item) => (
          <UntimedRow key={item.key} item={item} today={today} />
        ))}
        {timed.map((item, i) => [
          i === nowAt && nowLine,
          i === nowAt && <PickCallout key="pick" today={today} freeMinutes={freeMinutesUntilNextClass(now, timed)} />,
          <CheckRow
            key={item.key}
            time={item.slot.start}
            title={item.slot.course}
            sub={[`${item.slot.end}까지`, item.slot.room].filter(Boolean).join(" · ")}
            past={isPastClass(item.slot.end)}
          />,
        ])}
        {nowAt === timed.length && [
          nowLine,
          <PickCallout key="pick" today={today} freeMinutes={freeMinutesUntilNextClass(now, timed)} />,
        ]}
        {total === 0 && (
          <p className="px-3.5 py-4 text-sm text-muted">
            {deadlines.length === 0 && timetable.length === 0 ? (
              <>
                아직 일정이 없어요.{" "}
                <Link href="/calendar" className="font-semibold text-brand">
                  강의계획서 올리기 →
                </Link>
              </>
            ) : (
              "이날은 일정이 없어요."
            )}
          </p>
        )}
      </div>

      <div className="border-t border-divider p-1.5">
        <Button variant="ghost" className="w-full !text-muted" onClick={() => setActivityOpen(true)}>
          <Plus size={18} strokeWidth={1.8} aria-hidden="true" />
          대외활동 일정 넣기
        </Button>
      </div>

      <BottomSheet open={activityOpen} onClose={() => setActivityOpen(false)} title="대외활동 일정">
        <Activities />
      </BottomSheet>
    </Block>
    </>
  );
}

function UntimedRow({ item, today }: { item: PlanItem; today: string }) {
  if (item.type === "deadline") {
    const d = item.deadline;
    const badge = BADGE_OF[d.kind];
    return (
      <CheckRow
        time="마감"
        title={d.title}
        sub={d.course || d.kind}
        past={d.done}
        right={
          <>
            {badge && <Badge kind={badge}>{d.kind}</Badge>}
            <Checkbox checked={Boolean(d.done)} onChange={(v) => setDeadlineDone(d.id, v)} label={`${d.title} 완료`} />
          </>
        }
      />
    );
  }
  if (item.type === "activity") {
    const a = item.activity;
    return (
      <CheckRow
        time="활동"
        title={a.title}
        sub={a.date === today ? "대외활동 · 오늘" : "대외활동"}
        past={a.done}
        right={<Checkbox checked={Boolean(a.done)} onChange={(v) => setActivityDone(a.id, v)} label={`${a.title} 완료`} />}
      />
    );
  }
  if (item.type === "class-untimed") {
    return <CheckRow time="수업" title={item.slot.course} sub="시간 미정" />;
  }
  return null;
}

// 블록 안 강조 블록(화면에 하나): 지금 할 일. 다음 수업까지 30분 넘게 비거나 오늘 수업이 끝났을 때만 보인다.
function PickCallout({ today, freeMinutes }: { today: string; freeMinutes: number | null }) {
  const deadlines = useSavedDeadlines();
  const aiText = useTodayPick();
  const [index, setIndex] = useState(0);

  const candidates = pickCandidates(today, deadlines);
  if (candidates.length === 0) return null;
  if (freeMinutes !== null && freeMinutes < MIN_FREE_MINUTES) return null;

  const pick: SavedDeadline = candidates[index % candidates.length];
  const isExam = pick.kind === "중간" || pick.kind === "기말" || pick.kind === "퀴즈";

  return (
    <div className="p-3.5">
      <div className="rounded-callout bg-brand-soft p-3.5">
        <p className="text-xs font-semibold text-brand">
          {freeMinutes === null ? "지금 시작할 일" : `빈 시간 ${formatDuration(freeMinutes)} · 이거 하기 좋아요`}
        </p>
        <p className="mt-1 text-[15px] font-bold">{pick.title}</p>
        <p className="text-xs text-muted">
          {pick.course && `${pick.course} · `}
          <span className="font-mono font-semibold text-brand">{dDay(today, pick.date)}</span>
        </p>
        {index % candidates.length === 0 && aiText && (
          <p className="mt-2 text-[13px] leading-relaxed text-ink/80">{aiText}</p>
        )}
        <div className="mt-3 flex gap-2">
          {candidates.length > 1 && (
            <Button variant="secondary" className="flex-1 !bg-surface" onClick={() => setIndex((i) => i + 1)}>
              다른 일
            </Button>
          )}
          {isExam ? (
            <Link
              href="/exam"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-button bg-brand px-4 text-[15px] font-semibold text-white active:bg-brand-strong"
            >
              시험 대비
            </Link>
          ) : (
            <Button className="flex-1" onClick={() => setDeadlineDone(pick.id, true)}>
              다 했어요
            </Button>
          )}
        </div>
        <Link href="/today" className="mt-2.5 block text-center text-xs font-semibold text-brand underline-offset-2 active:underline">
          공부할 시간으로 하나 고르기 →
        </Link>
      </div>
    </div>
  );
}
