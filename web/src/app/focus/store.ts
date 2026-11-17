import { z } from "zod";

// 집중 모드의 시간 계산과 저장을 맡는다. 모든 기록은 이 브라우저에만 남고 서버로 보내지 않는다.

const DEFAULT_FOCUS_HOURS = 1;
export const MIN_RECORD_MINUTES = 1;
// minutes가 없는 옛 타이머는 25분짜리였다.
const LEGACY_FOCUS_MINUTES = 25;
export const BREAK_MINUTES = 5;
// 집중은 30분씩 끊어서 한다. 30분이 끝날 때마다 알람이 울리고, 이어서 할지 마칠지 고른다.
export const BLOCK_MINUTES = 30;
export const MAX_SUBJECT_LENGTH = 30;

const STORAGE_KEY = "unis-focus";

const focusDataSchema = z.object({
  subjects: z.array(z.string()),
  records: z.array(
    z.object({
      subject: z.string(),
      minutes: z.number().nonnegative(),
      finishedAt: z.number(),
      // 일정이나 대외활동에서 시작한 기록만 있다. 옛 기록에는 없다.
      deadlineId: z.string().optional(),
      activityId: z.string().optional(),
    }),
  ),
  session: z
    .object({
      subject: z.string(),
      // checkpoint: 30분 하나를 마치고 다음 30분을 기다리는 중. 기다리는 시간은 기록하지 않는다.
      phase: z.enum(["focus", "checkpoint", "break", "done"]),
      // 남은 초를 세지 않고 지금 30분이 끝나는 시각을 저장한다. 화면이 꺼져 있어도 시간이 어긋나지 않는다.
      endsAt: z.number(),
      // 고른 집중 시간 전체. 옛 타이머에는 없다.
      minutes: z.number().positive().optional(),
      // 지금 30분의 길이. 마지막 조각은 30분보다 짧을 수 있다. 옛 타이머에는 없어서 남은 시간 전체를 한 조각으로 본다.
      blockMinutes: z.number().positive().optional(),
      // 이번 집중에서 이미 기록한 분. 30분을 마칠 때마다 바로 기록하므로 그만둬도 사라지지 않는다.
      doneMinutes: z.number().nonnegative().optional(),
      deadlineId: z.string().optional(),
      activityId: z.string().optional(),
    })
    .nullable(),
});

export type FocusData = z.infer<typeof focusDataSchema>;
export type FocusLink = { deadlineId?: string; activityId?: string };

const EMPTY_DATA: FocusData = { subjects: [], records: [], session: null };

const listeners = new Set<() => void>();
let cachedData = EMPTY_DATA;
let cachedRaw: string | null = null;
let persisted = true;

function parseData(raw: string | null) {
  if (!raw) return EMPTY_DATA;
  try {
    const parsed = focusDataSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY_DATA;
  } catch {
    return EMPTY_DATA;
  }
}

// localStorage를 못 쓰는 환경에서는 메모리에 든 값을 그대로 돌려줘서 화면이 깨지지 않게 한다.
function readData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedData = parseData(raw);
    }
  } catch {
    persisted = false;
  }
  return cachedData;
}

function writeData(next: FocusData) {
  cachedData = next;
  try {
    const raw = JSON.stringify(next);
    localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    persisted = true;
  } catch {
    persisted = false;
  }
  listeners.forEach((listener) => listener());
}

export function subscribeData(listener: () => void) {
  listeners.add(listener);
  // 같은 기기의 다른 탭에서 바꾼 내용도 바로 반영한다.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export const getData = readData;
export const getServerData = () => EMPTY_DATA;
export const isPersisted = () => persisted;
export const getServerPersisted = () => true;

export function subscribeClock(listener: () => void) {
  const timer = setInterval(listener, 250);
  // 폰 화면을 다시 켜거나 탭으로 돌아오면 바로 시간을 다시 계산한다.
  document.addEventListener("visibilitychange", listener);
  window.addEventListener("focus", listener);
  window.addEventListener("pageshow", listener);
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", listener);
    window.removeEventListener("focus", listener);
    window.removeEventListener("pageshow", listener);
  };
}

export function sessionMinutes(session: { minutes?: number }) {
  return session.minutes ?? LEGACY_FOCUS_MINUTES;
}

// 이번 집중에서 이미 기록한 분.
export function doneMinutesOf(session: { doneMinutes?: number }) {
  return session.doneMinutes ?? 0;
}

// 지금 돌고 있는(또는 방금 마친) 30분 조각의 길이.
export function blockMinutesOf(session: { minutes?: number; blockMinutes?: number; doneMinutes?: number }) {
  return session.blockMinutes ?? sessionMinutes(session) - doneMinutesOf(session);
}

// 다음 조각의 길이. 남은 시간이 30분보다 적으면 남은 만큼만.
function nextBlockMinutes(session: { minutes?: number; doneMinutes?: number }) {
  return Math.min(BLOCK_MINUTES, sessionMinutes(session) - doneMinutesOf(session));
}

// 몇 번째 30분인지와 모두 몇 번인지. 화면에 "2 / 4"처럼 보여 준다.
export function blockPosition(session: { minutes?: number; doneMinutes?: number }) {
  const total = Math.max(1, Math.ceil(sessionMinutes(session) / BLOCK_MINUTES));
  const current = Math.min(total, Math.floor(doneMinutesOf(session) / BLOCK_MINUTES) + 1);
  return { current, total };
}

// 초 단위로 끊어서 1초에 한 번만 화면을 다시 그리게 한다.
export const getNow = () => Math.floor(Date.now() / 1000) * 1000;
export const getServerNow = () => 0;

// 지금 30분 조각에서 지난 시간. 다 채운 분만 센다. 집중 중이 아니면 0이다.
export function elapsedFocusMinutes(session: NonNullable<FocusData["session"]>, now: number) {
  if (session.phase !== "focus") return 0;
  const block = blockMinutesOf(session);
  const elapsed = Math.floor(block - (session.endsAt - now) / 60000);
  return Math.min(block, Math.max(0, elapsed));
}

// 지금 그만두면 이번 집중으로 남는 분. 앞서 마친 30분들과 지금 조각에서 1분 이상 한 시간을 더한다.
export function minutesIfStopped(session: NonNullable<FocusData["session"]>, now: number) {
  const elapsed = elapsedFocusMinutes(session, now);
  return doneMinutesOf(session) + (elapsed >= MIN_RECORD_MINUTES ? elapsed : 0);
}

function recordOf(session: NonNullable<FocusData["session"]>, minutes: number, finishedAt: number) {
  return {
    subject: session.subject,
    minutes,
    finishedAt,
    ...(session.deadlineId ? { deadlineId: session.deadlineId } : {}),
    ...(session.activityId ? { activityId: session.activityId } : {}),
  };
}

// 지난 시간을 따라잡는다. 저장소의 최신 값을 읽고 한 번에 쓰므로 탭이 여러 개여도 기록은 한 번만 남는다.
// 이번 호출로 집중이 끝났으면 끝난 시각을 돌려준다. 다른 탭이 먼저 처리했으면 null이다.
export function settleSession(now: number) {
  const data = readData();
  let { session, records } = data;
  if (!session) return null;

  let focusEndedAt: number | null = null;
  if (session.phase === "focus" && now >= session.endsAt) {
    focusEndedAt = session.endsAt;
    const block = blockMinutesOf(session);
    const done = doneMinutesOf(session) + block;
    records = [...records, recordOf(session, block, session.endsAt)];
    session =
      done >= sessionMinutes(session)
        ? {
            // 고른 시간을 다 채웠다. 휴식은 돌아온 시각이 아니라 집중이 끝난 시각부터 센다.
            ...session,
            doneMinutes: done,
            phase: "break",
            endsAt: session.endsAt + BREAK_MINUTES * 60 * 1000,
          }
        : // 30분 하나를 마쳤다. 사용자가 이어서 하기를 누를 때까지 멈춰 있는다.
          { ...session, doneMinutes: done, phase: "checkpoint" };
  }
  if (session.phase === "break" && now >= session.endsAt) {
    session = { ...session, phase: "done" };
  }
  if (session !== data.session) writeData({ ...data, records, session });
  return focusEndedAt;
}

export function startFocus(subject: string, link: FocusLink = {}, hours: number = DEFAULT_FOCUS_HOURS) {
  const data = readData();
  if (data.session && data.session.phase !== "done") return;
  writeData({
    ...data,
    session: {
      subject,
      phase: "focus",
      endsAt: Date.now() + Math.min(BLOCK_MINUTES, hours * 60) * 60 * 1000,
      minutes: hours * 60,
      blockMinutes: Math.min(BLOCK_MINUTES, hours * 60),
      doneMinutes: 0,
      ...link,
    },
  });
}

// 30분을 마치고 멈춰 있을 때 다음 30분을 시작한다. 다음 조각은 누른 시각부터 센다.
export function continueFocus(now: number = Date.now()) {
  settleSession(now);
  const data = readData();
  const session = data.session;
  if (session?.phase !== "checkpoint") return;
  const block = nextBlockMinutes(session);
  writeData({
    ...data,
    session: { ...session, phase: "focus", blockMinutes: block, endsAt: now + block * 60 * 1000 },
  });
}

export function skipBreak() {
  settleSession(Date.now());
  const data = readData();
  if (data.session?.phase !== "break") return;
  writeData({ ...data, session: { ...data.session, phase: "done" } });
}

export function endSession(now: number = Date.now()) {
  // 이미 정한 시간이 지났다면 그만두기 전에 기록부터 남긴다.
  settleSession(now);
  const data = readData();
  // 중간에 그만두면 지금 30분에서 집중한 시간만 더 기록한다. 앞서 마친 30분들은 이미 기록돼 있다.
  // 1분이 안 되면 잘못 누른 것으로 보고 남기지 않는다.
  const minutes = data.session ? elapsedFocusMinutes(data.session, now) : 0;
  const records =
    data.session && minutes >= MIN_RECORD_MINUTES
      ? [...data.records, recordOf(data.session, minutes, now)]
      : data.records;
  writeData({ ...data, records, session: null });
}

export function addSubject(name: string) {
  const data = readData();
  if (data.subjects.includes(name)) return;
  writeData({ ...data, subjects: [...data.subjects, name] });
}

export function removeSubject(name: string) {
  const data = readData();
  writeData({ ...data, subjects: data.subjects.filter((s) => s !== name) });
}
