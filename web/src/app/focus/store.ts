import { z } from "zod";

// 집중 모드의 시간 계산과 저장을 맡는다. 모든 기록은 이 브라우저에만 남고 서버로 보내지 않는다.

export const FOCUS_MINUTES = 25;
export const BREAK_MINUTES = 5;
export const MAX_SUBJECT_LENGTH = 30;

const STORAGE_KEY = "unis-focus";

const focusDataSchema = z.object({
  subjects: z.array(z.string()),
  records: z.array(
    z.object({
      subject: z.string(),
      minutes: z.number().nonnegative(),
      finishedAt: z.number(),
    }),
  ),
  session: z
    .object({
      subject: z.string(),
      phase: z.enum(["focus", "break", "done"]),
      // 남은 초를 세지 않고 끝나는 시각을 저장한다. 화면이 꺼져 있어도 시간이 어긋나지 않는다.
      endsAt: z.number(),
    })
    .nullable(),
});

export type FocusData = z.infer<typeof focusDataSchema>;

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

// 초 단위로 끊어서 1초에 한 번만 화면을 다시 그리게 한다.
export const getNow = () => Math.floor(Date.now() / 1000) * 1000;
export const getServerNow = () => 0;

// 지난 시간을 따라잡는다. 저장소의 최신 값을 읽고 한 번에 쓰므로 탭이 여러 개여도 기록은 한 번만 남는다.
// 이번 호출로 집중이 끝났으면 끝난 시각을 돌려준다. 다른 탭이 먼저 처리했으면 null이다.
export function settleSession(now: number) {
  const data = readData();
  let { session, records } = data;
  if (!session) return null;

  let focusEndedAt: number | null = null;
  if (session.phase === "focus" && now >= session.endsAt) {
    focusEndedAt = session.endsAt;
    records = [
      ...records,
      { subject: session.subject, minutes: FOCUS_MINUTES, finishedAt: session.endsAt },
    ];
    // 휴식은 돌아온 시각이 아니라 집중이 끝난 시각부터 센다.
    session = {
      ...session,
      phase: "break",
      endsAt: session.endsAt + BREAK_MINUTES * 60 * 1000,
    };
  }
  if (session.phase === "break" && now >= session.endsAt) {
    session = { ...session, phase: "done" };
  }
  if (session !== data.session) writeData({ ...data, records, session });
  return focusEndedAt;
}

export function startFocus(subject: string) {
  const data = readData();
  if (data.session && data.session.phase !== "done") return;
  writeData({
    ...data,
    session: {
      subject,
      phase: "focus",
      endsAt: Date.now() + FOCUS_MINUTES * 60 * 1000,
    },
  });
}

export function skipBreak() {
  settleSession(Date.now());
  const data = readData();
  if (data.session?.phase !== "break") return;
  writeData({ ...data, session: { ...data.session, phase: "done" } });
}

export function endSession() {
  // 이미 25분이 지났다면 그만두기 전에 기록부터 남긴다.
  settleSession(Date.now());
  writeData({ ...readData(), session: null });
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
