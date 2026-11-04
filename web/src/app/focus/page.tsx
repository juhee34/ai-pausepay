"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";
import Button from "@/components/ui/button";
import { isHomeActivity, useActivities } from "@/lib/activity-store";
import { useSavedDeadlines } from "@/lib/deadline-store";
import { useTimetable } from "@/lib/timetable-store";
import {
  ALARM_SECONDS,
  ALERT_WINDOW_MS,
  getServerAlarmRinging,
  isAlarmRinging,
  prepareAlert,
  startAlarm,
  stopAlarm,
  subscribeAlarm,
} from "./alert";
import {
  BREAK_MINUTES,
  FOCUS_MINUTES,
  MAX_SUBJECT_LENGTH,
  addSubject,
  endSession,
  getData,
  getNow,
  getServerData,
  getServerNow,
  getServerPersisted,
  isPersisted,
  removeSubject,
  settleSession,
  skipBreak,
  startFocus,
  subscribeClock,
  subscribeData,
  type FocusData,
  type FocusLink,
} from "./store";
import { weeklyMinutes } from "./weekly";

type Session = NonNullable<FocusData["session"]>;

const ALERT_NOTICE = `폰 화면을 켜 두고 이 화면을 열어 두면 끝날 때 알람이 울려요. 화면을 누르면 꺼지고, 누르지 않아도 ${ALARM_SECONDS}초 뒤에 멈춰요. 화면이 꺼지면 울리지 않을 수 있고, 아이폰은 진동이 없고 무음 모드에서는 소리도 나지 않아요. 기록은 그대로 저장돼요.`;

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}분`;
  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}

function isSameDay(a: number, b: number) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function summarize(records: FocusData["records"], now: number) {
  const bySubject = new Map<string, { total: number; today: number }>();
  let today = 0;
  for (const record of records) {
    const row = bySubject.get(record.subject) ?? { total: 0, today: 0 };
    row.total += record.minutes;
    if (isSameDay(record.finishedAt, now)) {
      row.today += record.minutes;
      today += record.minutes;
    }
    bySubject.set(record.subject, row);
  }
  const rows = [...bySubject.entries()]
    .map(([subject, row]) => ({ subject, ...row }))
    .sort((a, b) => b.total - a.total);
  return { rows, today };
}

// 주소로 넘어온 일정·대외활동을 찾는다. /focus?deadline=<id>, /focus?activity=<id>, /focus?course=<과목>
function useFocusTarget() {
  const params = useSearchParams();
  const deadlines = useSavedDeadlines();
  const activities = useActivities();

  const deadline = deadlines.find((d) => d.id === params.get("deadline"));
  if (deadline) {
    return {
      subject: deadline.course.trim() || deadline.title,
      label: deadline.title,
      link: { deadlineId: deadline.id } as FocusLink,
    };
  }
  const activity = activities.find((a) => a.id === params.get("activity"));
  if (activity) {
    return { subject: activity.title, label: activity.title, link: { activityId: activity.id } as FocusLink };
  }
  const course = params.get("course")?.trim().slice(0, MAX_SUBJECT_LENGTH);
  return course ? { subject: course, label: null, link: {} as FocusLink } : null;
}

function SubjectPicker({ data }: { data: FocusData }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const target = useFocusTarget();
  const timetable = useTimetable();
  const deadlines = useSavedDeadlines();
  const activities = useActivities();

  // 공고 일정의 course에는 기관 이름이 들어 있어 과목에서 뺀다.
  const fromSchedule = [...timetable, ...deadlines.filter((d) => !d.source)].map((item) => item.course.trim());
  const subjects = [
    ...new Set([target?.subject ?? "", ...fromSchedule, ...data.subjects].filter(Boolean)),
  ];
  // 공고로 만든 카드도 고를 수 있게 하고, 끝났거나 불합격한 활동만 뺀다.
  const activityOptions = activities.filter(
    (a) => isHomeActivity({ ...a, fromPosting: false }) && !subjects.includes(a.title),
  );
  const options = [...subjects, ...activityOptions.map((a) => a.title)];

  // 고른 과목이 지워졌으면 넘어온 과목이나 첫 번째 과목을 고른 것으로 친다.
  const subject = selected && options.includes(selected) ? selected : (target?.subject ?? options[0]);
  const hasRecord = data.records.some((record) => record.subject === subject);
  const canRemove = data.subjects.includes(subject) && !hasRecord && !fromSchedule.includes(subject);
  const targetActive = target !== null && subject === target.subject;
  const pickedActivity = activityOptions.find((a) => a.title === subject);
  const link: FocusLink = targetActive
    ? target.link
    : pickedActivity
      ? { activityId: pickedActivity.id }
      : {};

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newSubject.trim();
    if (!name) return;
    addSubject(name);
    setSelected(name);
    setNewSubject("");
  }

  const chip = (name: string) => (
    <label
      key={name}
      className={`flex min-h-11 max-w-full cursor-pointer items-center break-words rounded-button px-3.5 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
        subject === name ? "bg-brand-soft text-brand" : "bg-canvas text-muted"
      }`}
    >
      <input
        type="radio"
        name="subject"
        value={name}
        checked={subject === name}
        onChange={() => setSelected(name)}
        className="sr-only"
      />
      {name}
    </label>
  );

  return (
    <div className="space-y-2.5">
      <Block className="space-y-3.5">
        {options.length > 0 && (
          <fieldset>
            <legend className="text-[15px] font-bold">어떤 과목을 공부할까요?</legend>
            {targetActive && target.label && (
              <p className="mt-2 break-words rounded-button bg-canvas px-3 py-2 text-xs leading-relaxed">
                <span className="font-semibold">연결한 일정</span> {target.label}
              </p>
            )}
            {subjects.length > 0 && <div className="mt-2.5 flex flex-wrap gap-2">{subjects.map(chip)}</div>}
            {activityOptions.length > 0 && (
              <>
                <p className="mt-3 text-xs font-semibold text-muted">대외활동</p>
                <div className="mt-1.5 flex flex-wrap gap-2">{activityOptions.map((a) => chip(a.title))}</div>
              </>
            )}
            {canRemove && (
              <Button
                variant="ghost"
                onClick={() => removeSubject(subject)}
                className="mt-1 -ml-2 px-2 text-[13px]"
              >
                이 과목 지우기
              </Button>
            )}
          </fieldset>
        )}

        <form onSubmit={handleAdd}>
          <label className="block text-sm font-semibold" htmlFor="new-subject">
            과목 추가
          </label>
          <div className="mt-1.5 flex gap-2">
            {/* 글자가 16px보다 작으면 아이폰이 입력할 때 화면을 확대한다. */}
            <input
              id="new-subject"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              maxLength={MAX_SUBJECT_LENGTH}
              placeholder="예: 재무관리"
              className="min-h-11 min-w-0 flex-1 rounded-button border border-line bg-surface px-3.5 py-2.5 text-base text-ink outline-none placeholder:text-muted focus:border-brand"
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={!newSubject.trim()}
              className="shrink-0"
            >
              추가
            </Button>
          </div>
        </form>
      </Block>

      <Button disabled={!subject} onClick={() => startFocus(subject, link)} className="w-full">
        <span className="font-mono">{FOCUS_MINUTES}</span>분 집중 시작
      </Button>
      <p className="px-1 text-xs leading-relaxed text-muted">{ALERT_NOTICE}</p>
    </div>
  );
}

function RunningCard({ session, now }: { session: Session; now: number }) {
  const [confirmingStop, setConfirmingStop] = useState(false);

  const isFocus = session.phase === "focus";
  const totalSeconds = (isFocus ? FOCUS_MINUTES : BREAK_MINUTES) * 60;
  const remaining = Math.min(
    totalSeconds,
    Math.max(0, Math.floor((session.endsAt - now) / 1000)),
  );
  const progress = ((totalSeconds - remaining) / totalSeconds) * 100;

  return (
    <Block className="text-center">
      <p className="text-sm font-semibold text-brand">
        {isFocus ? "집중하는 중" : "쉬는 중"}
      </p>
      <p className="mt-0.5 break-words text-sm text-muted">{session.subject}</p>
      <p role="timer" className="mt-3 font-mono text-6xl font-semibold tabular-nums">
        {formatClock(remaining)}
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-divider">
        <div className="h-full bg-brand" style={{ width: `${progress}%` }} />
      </div>

      {isFocus && (
        <p className="mt-3.5 text-left text-xs leading-relaxed text-muted">{ALERT_NOTICE}</p>
      )}

      {!isFocus && (
        <Button variant="secondary" onClick={skipBreak} className="mt-3.5 w-full">
          휴식 건너뛰기
        </Button>
      )}

      {isFocus && !confirmingStop && (
        <Button
          variant="secondary"
          onClick={() => setConfirmingStop(true)}
          className="mt-3.5 w-full"
        >
          그만두기
        </Button>
      )}

      {isFocus && confirmingStop && (
        <div className="mt-3.5">
          <p className="text-sm text-muted">
            {FOCUS_MINUTES}분을 채우지 않으면 이번 시간은 기록되지 않아요.
          </p>
          <div className="mt-2.5 flex gap-2">
            <Button onClick={() => setConfirmingStop(false)} className="flex-1">
              계속하기
            </Button>
            <Button variant="secondary" onClick={endSession} className="flex-1">
              그만두기
            </Button>
          </div>
        </div>
      )}
    </Block>
  );
}

function DoneCard({ session }: { session: Session }) {
  return (
    <Block className="text-center">
      <p className="text-[17px] font-bold">수고했어요!</p>
      <p className="mt-1 break-words text-sm text-muted">
        {session.subject} 공부 시간에 <span className="font-mono">{FOCUS_MINUTES}</span>분을
        더했어요.
      </p>
      <Button
        onClick={() =>
          startFocus(session.subject, { deadlineId: session.deadlineId, activityId: session.activityId })
        }
        className="mt-3.5 w-full"
      >
        한 번 더 집중
      </Button>
      <Button variant="secondary" onClick={endSession} className="mt-2 w-full">
        다른 과목 고르기
      </Button>
    </Block>
  );
}

function WeeklyBars({ records, now }: { records: FocusData["records"]; now: number }) {
  const deadlines = useSavedDeadlines();
  const examDates = deadlines
    .filter((d) => !d.source && (d.kind === "중간" || d.kind === "기말"))
    .map((d) => d.date);
  const bars = weeklyMinutes(records, now, examDates);
  const windowTotal = bars.reduce((sum, bar) => sum + bar.minutes, 0);
  const allTotal = records.reduce((sum, record) => sum + record.minutes, 0);
  const highest = Math.max(...bars.map((bar) => bar.minutes), 1);

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-[15px] font-bold">주차별 집중 시간</h2>
        <p className="shrink-0 font-mono text-xs font-medium text-muted">최근 6주 {formatMinutes(windowTotal)}</p>
      </div>
      <Block>
        <ul className="flex h-36 items-end gap-2">
          {bars.map((bar) => (
            <li
              key={bar.start}
              aria-label={`${Number(bar.start.slice(5, 7))}월 ${Number(bar.start.slice(8))}일 주 ${formatMinutes(bar.minutes)}${bar.isExam ? ", 시험 주" : ""}`}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
            >
              <span className="mb-1 font-mono text-[11px] font-semibold">{bar.minutes > 0 ? bar.minutes : ""}</span>
              {/* 막대가 숫자와 날짜 자리를 침범하지 않게 칸의 70%까지만 쓴다. */}
              <span
                aria-hidden="true"
                className={`block w-full max-w-7 rounded-t ${bar.isExam ? "bg-brand" : "bg-[#A89BB0]"}`}
                style={{ height: bar.minutes > 0 ? `max(4px, ${(bar.minutes / highest) * 70}%)` : 0 }}
              />
              <span
                className={`mt-1 font-mono text-[10px] ${bar.isCurrent ? "font-semibold text-brand" : "text-muted"}`}
              >
                {Number(bar.start.slice(5, 7))}/{Number(bar.start.slice(8))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="h-2 w-2 rounded-sm bg-brand" />
            시험 주
          </span>
          <span>숫자는 분, 날짜는 그 주 월요일이에요</span>
        </p>
        {allTotal !== windowTotal && (
          <p className="mt-1 font-mono text-[11px] text-muted">전체 기록 {formatMinutes(allTotal)}</p>
        )}
      </Block>
    </section>
  );
}

function FocusContent() {
  const data = useSyncExternalStore(subscribeData, getData, getServerData);
  const persisted = useSyncExternalStore(subscribeData, isPersisted, getServerPersisted);
  const now = useSyncExternalStore(subscribeClock, getNow, getServerNow);
  const ringing = useSyncExternalStore(subscribeAlarm, isAlarmRinging, getServerAlarmRinging);

  const { session, records } = data;

  useEffect(() => {
    if (session && session.phase !== "done" && now >= session.endsAt) {
      const current = Date.now();
      const focusEndedAt = settleSession(current);
      if (focusEndedAt !== null && current - focusEndedAt <= ALERT_WINDOW_MS) {
        startAlarm();
      }
    }
  }, [session, now]);

  // 새로 고친 뒤에도 소리가 나도록, 시작 버튼만이 아니라 화면을 누를 때마다 준비한다.
  // 알람이 울리는 중에는 화면 어디를 눌러도 끈다. 다른 화면으로 가도 끈다.
  useEffect(() => {
    const handleClick = () => {
      stopAlarm();
      prepareAlert();
    };
    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("click", handleClick);
      stopAlarm();
    };
  }, []);

  const { rows, today } = summarize(records, now);

  return (
    <AppShell>
      <header className="mb-4 px-1">
        <p className="text-xs font-medium text-muted">집중 모드</p>
        <h1 className="text-[22px] font-bold">
          <span className="font-mono font-semibold">{FOCUS_MINUTES}</span>분 집중,{" "}
          <span className="font-mono font-semibold">{BREAK_MINUTES}</span>분 휴식
        </h1>
        <p className="mt-1 text-sm text-muted">
          과목을 고르고 시작하세요. {FOCUS_MINUTES}분을 채우면 공부 시간이 기록돼요.
        </p>
      </header>

      <div className="space-y-2.5">
        {!persisted && (
          <div
            role="alert"
            className="rounded-callout border border-review-line bg-review-soft p-3.5 text-sm text-review"
          >
            이 브라우저에서는 저장을 할 수 없어요. 타이머는 쓸 수 있지만 창을 닫으면 기록이
            사라져요.
          </div>
        )}

        {ringing && (
          <Button onClick={stopAlarm} className="min-h-14 w-full text-base font-bold">
            알람 끄기
          </Button>
        )}

        {!session && <SubjectPicker data={data} />}
        {session && session.phase !== "done" && (
          <RunningCard key={session.endsAt} session={session} now={now} />
        )}
        {session?.phase === "done" && <DoneCard session={session} />}
      </div>

      {records.length > 0 && <WeeklyBars records={records} now={now} />}

      <section className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-[15px] font-bold">과목별 공부 시간</h2>
          {rows.length > 0 && (
            <p className="shrink-0 font-mono text-xs font-medium text-muted">
              오늘 {formatMinutes(today)}
            </p>
          )}
        </div>
        {rows.length === 0 ? (
          <Block className="text-sm text-muted">
            아직 기록이 없어요. {FOCUS_MINUTES}분 집중을 마치면 여기에 쌓여요.
          </Block>
        ) : (
          <Block padded={false}>
            <ul className="divide-y divide-divider">
              {rows.map((row) => (
                <li
                  key={row.subject}
                  className="flex min-h-11 items-center justify-between gap-4 px-3.5 py-2.5"
                >
                  <span className="min-w-0 break-words text-[15px] font-medium">
                    {row.subject}
                  </span>
                  <span className="shrink-0 text-right font-mono">
                    <span className="block text-sm font-semibold">
                      {formatMinutes(row.total)}
                    </span>
                    {row.today > 0 && (
                      <span className="block text-xs font-medium text-muted">
                        오늘 {formatMinutes(row.today)}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Block>
        )}
        <p className="mt-2 px-1 text-xs text-muted">
          기록은 이 브라우저에만 저장돼요. 브라우저 데이터를 지우면 함께 사라져요.
        </p>
      </section>
    </AppShell>
  );
}

export default function FocusPage() {
  // useSearchParams를 쓰는 화면은 Suspense로 감싸야 빌드된다.
  return (
    <Suspense fallback={null}>
      <FocusContent />
    </Suspense>
  );
}
