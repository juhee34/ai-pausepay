"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ALERT_WINDOW_MS, playEndAlert, prepareAlert } from "./alert";
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
} from "./store";

type Session = NonNullable<FocusData["session"]>;

const ALERT_NOTICE =
  "폰 화면을 켜 두고 이 화면을 열어 두면 끝날 때 소리와 진동으로 알려 드려요. 화면이 꺼지면 울리지 않을 수 있고, 아이폰은 진동이 없고 무음 모드에서는 소리도 나지 않아요. 기록은 그대로 저장돼요.";

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

function SubjectPicker({ data }: { data: FocusData }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState("");

  // 고른 과목이 지워졌으면 첫 번째 과목을 고른 것으로 친다.
  const subject =
    selected && data.subjects.includes(selected) ? selected : data.subjects[0];
  const hasRecord = data.records.some((record) => record.subject === subject);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newSubject.trim();
    if (!name) return;
    addSubject(name);
    setSelected(name);
    setNewSubject("");
  }

  return (
    <div className="mt-8 space-y-6">
      {data.subjects.length > 0 && (
        <fieldset>
          <legend className="text-sm font-semibold">어떤 과목을 공부할까요?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.subjects.map((s) => (
              <label
                key={s}
                className={`max-w-full cursor-pointer break-words rounded-full border px-4 py-2 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                  subject === s
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-foreground/15 text-foreground/70"
                }`}
              >
                <input
                  type="radio"
                  name="subject"
                  value={s}
                  checked={subject === s}
                  onChange={() => setSelected(s)}
                  className="sr-only"
                />
                {s}
              </label>
            ))}
          </div>
          {!hasRecord && (
            <button
              type="button"
              onClick={() => removeSubject(subject)}
              className="mt-2 text-xs text-foreground/50 underline"
            >
              이 과목 지우기
            </button>
          )}
        </fieldset>
      )}

      <form onSubmit={handleAdd}>
        <label className="block text-sm font-semibold" htmlFor="new-subject">
          과목 추가
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="new-subject"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            maxLength={MAX_SUBJECT_LENGTH}
            placeholder="예: 재무관리"
            className="min-w-0 flex-1 rounded-xl border border-foreground/15 bg-transparent px-4 py-3 text-base outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={!newSubject.trim()}
            className="shrink-0 rounded-xl bg-accent-soft px-4 py-3 text-sm font-semibold text-accent disabled:opacity-60"
          >
            추가
          </button>
        </div>
      </form>

      <button
        type="button"
        disabled={!subject}
        onClick={() => startFocus(subject)}
        className="w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {FOCUS_MINUTES}분 집중 시작
      </button>
      <p className="text-xs leading-relaxed text-foreground/50">{ALERT_NOTICE}</p>
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
    <div className="mt-8 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 text-center">
      <p className="text-sm font-semibold text-accent">
        {isFocus ? "집중하는 중" : "쉬는 중"}
      </p>
      <p className="mt-1 break-words text-sm text-foreground/70">{session.subject}</p>
      <p role="timer" className="mt-4 font-mono text-6xl font-bold tabular-nums">
        {formatClock(remaining)}
      </p>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-foreground/10">
        <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
      </div>

      {isFocus && (
        <p className="mt-4 text-left text-xs leading-relaxed text-foreground/50">
          {ALERT_NOTICE}
        </p>
      )}

      {!isFocus && (
        <button
          type="button"
          onClick={skipBreak}
          className="mt-5 w-full rounded-xl bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent"
        >
          휴식 건너뛰기
        </button>
      )}

      {isFocus && !confirmingStop && (
        <button
          type="button"
          onClick={() => setConfirmingStop(true)}
          className="mt-5 w-full rounded-xl bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent"
        >
          그만두기
        </button>
      )}

      {isFocus && confirmingStop && (
        <div className="mt-5">
          <p className="text-sm text-foreground/70">
            {FOCUS_MINUTES}분을 채우지 않으면 이번 시간은 기록되지 않아요.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingStop(false)}
              className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"
            >
              계속하기
            </button>
            <button
              type="button"
              onClick={endSession}
              className="flex-1 rounded-xl bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent"
            >
              그만두기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DoneCard({ session }: { session: Session }) {
  return (
    <div className="mt-8 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 text-center">
      <p className="text-lg font-bold">수고했어요!</p>
      <p className="mt-1 break-words text-sm text-foreground/70">
        {session.subject} 공부 시간에 {FOCUS_MINUTES}분을 더했어요.
      </p>
      <button
        type="button"
        onClick={() => startFocus(session.subject)}
        className="mt-5 w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white"
      >
        한 번 더 집중
      </button>
      <button
        type="button"
        onClick={endSession}
        className="mt-2 w-full rounded-xl bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent"
      >
        다른 과목 고르기
      </button>
    </div>
  );
}

export default function FocusPage() {
  const data = useSyncExternalStore(subscribeData, getData, getServerData);
  const persisted = useSyncExternalStore(subscribeData, isPersisted, getServerPersisted);
  const now = useSyncExternalStore(subscribeClock, getNow, getServerNow);

  const { session, records } = data;

  useEffect(() => {
    if (session && session.phase !== "done" && now >= session.endsAt) {
      const current = Date.now();
      const focusEndedAt = settleSession(current);
      if (focusEndedAt !== null && current - focusEndedAt <= ALERT_WINDOW_MS) {
        playEndAlert();
      }
    }
  }, [session, now]);

  // 새로 고친 뒤에도 소리가 나도록, 시작 버튼만이 아니라 화면을 누를 때마다 준비한다.
  useEffect(() => {
    window.addEventListener("click", prepareAlert);
    return () => window.removeEventListener("click", prepareAlert);
  }, []);

  const { rows, today } = summarize(records, now);

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-md px-5 pt-12 pb-20">
        <p className="text-accent text-xs font-semibold tracking-widest">집중 모드</p>
        <h1 className="mt-3 text-2xl font-bold leading-snug">
          {FOCUS_MINUTES}분만
          <br />
          우니스에게 맡겨 보세요
        </h1>
        <p className="mt-3 text-sm text-foreground/70">
          과목을 고르고 시작하면 {FOCUS_MINUTES}분 집중하고 {BREAK_MINUTES}분 쉬어요.{" "}
          {FOCUS_MINUTES}분을 채우면 공부 시간이 기록돼요.
        </p>

        {!persisted && (
          <div
            role="alert"
            className="mt-6 rounded-2xl bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300"
          >
            이 브라우저에서는 저장을 할 수 없어요. 타이머는 쓸 수 있지만 창을 닫으면
            기록이 사라져요.
          </div>
        )}

        {!session && <SubjectPicker data={data} />}
        {session && session.phase !== "done" && (
          <RunningCard key={session.endsAt} session={session} now={now} />
        )}
        {session?.phase === "done" && <DoneCard session={session} />}

        <div className="mt-8">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold">과목별 공부 시간</h2>
            {rows.length > 0 && (
              <p className="shrink-0 text-xs text-foreground/50">
                오늘 {formatMinutes(today)}
              </p>
            )}
          </div>
          {rows.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 text-sm text-foreground/60">
              아직 기록이 없어요. {FOCUS_MINUTES}분 집중을 마치면 여기에 쌓여요.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {rows.map((row) => (
                <li
                  key={row.subject}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"
                >
                  <span className="min-w-0 break-words text-sm font-semibold">
                    {row.subject}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold">
                      {formatMinutes(row.total)}
                    </span>
                    {row.today > 0 && (
                      <span className="block text-xs text-foreground/50">
                        오늘 {formatMinutes(row.today)}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-foreground/50">
            기록은 이 브라우저에만 저장돼요. 브라우저 데이터를 지우면 함께 사라져요.
          </p>
        </div>
      </section>
    </main>
  );
}
