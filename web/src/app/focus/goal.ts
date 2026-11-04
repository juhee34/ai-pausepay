// 오늘의 한 가지에서 넘어온 목표 시간과 오늘 집중한 시간을 비교한다. 화면 코드 없이 함수만 둔다.
//
// 확인용 예시
// 목표 2시간, 오늘 그 일정 기록 60분 → 남은 1시간을 먼저 넣어 둔다
// 목표 1.3시간, 기록 없음 → 1.5시간을 넣어 둔다 (30분 단위로 올림)
// 목표를 이미 채웠으면 → 1시간, 12시간보다 길면 → 12시간

export const MAX_GOAL_HOURS = 24;
export const FOCUS_STEP_HOURS = 0.5;
export const MIN_FOCUS_HOURS = 0.5;
export const MAX_FOCUS_HOURS = 12;
export const DEFAULT_FOCUS_HOURS = 1;

export type GoalRecord = {
  subject: string;
  minutes: number;
  finishedAt: number;
  deadlineId?: string;
  activityId?: string;
};
export type GoalTarget = { subject: string; link: { deadlineId?: string; activityId?: string } };
export type FocusGoal = { hours: number; doneMinutes: number };

export function isSameDay(a: number, b: number) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

// 주소에 든 값이라 무엇이든 올 수 있다. 쓸 수 없는 값이면 null.
export function parseGoalHours(value: string | null) {
  if (!value) return null;
  const hours = Number(value);
  return Number.isFinite(hours) && hours > 0 && hours <= MAX_GOAL_HOURS ? hours : null;
}

// 오늘 끝낸 기록 중 이 일정(또는 활동, 과목)의 시간만 더한다.
export function focusGoal(hours: number, records: GoalRecord[], now: number, target: GoalTarget): FocusGoal {
  const { deadlineId, activityId } = target.link;
  const doneMinutes = records
    .filter((record) => {
      if (!isSameDay(record.finishedAt, now)) return false;
      if (deadlineId) return record.deadlineId === deadlineId;
      if (activityId) return record.activityId === activityId;
      return record.subject === target.subject;
    })
    .reduce((sum, record) => sum + record.minutes, 0);
  return { hours, doneMinutes };
}

// 직접 넣은 집중 시간을 읽는다. 30분 단위가 아니거나 범위를 벗어나면 null.
export function parseFocusHours(text: string) {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const hours = Number(trimmed);
  if (!Number.isFinite(hours) || hours < MIN_FOCUS_HOURS || hours > MAX_FOCUS_HOURS) return null;
  return Number.isInteger(hours / FOCUS_STEP_HOURS) ? hours : null;
}

// 30분씩 늘리거나 줄인다. 범위를 넘지 않는다.
export function stepFocusHours(hours: number, direction: 1 | -1) {
  const next = hours + direction * FOCUS_STEP_HOURS;
  return Math.min(MAX_FOCUS_HOURS, Math.max(MIN_FOCUS_HOURS, next));
}

// 남은 시간을 30분 단위로 올림해서 먼저 넣어 둔다.
export function suggestHours(goal: FocusGoal) {
  const remaining = goal.hours - goal.doneMinutes / 60;
  if (remaining <= 0) return DEFAULT_FOCUS_HOURS;
  return Math.min(MAX_FOCUS_HOURS, Math.ceil(remaining / FOCUS_STEP_HOURS) * FOCUS_STEP_HOURS);
}

// 끝난 타이머를 다시 시작할 때 쓴다. 옛 25분 타이머는 30분으로 시작한다.
export function hoursFromMinutes(minutes: number) {
  return Math.max(MIN_FOCUS_HOURS, Math.round(minutes / 30) * FOCUS_STEP_HOURS);
}

// 주차별 막대 위의 숫자. 시간 단위, 소수 한 자리.
export function hoursLabel(minutes: number) {
  return String(Math.round((minutes / 60) * 10) / 10);
}
