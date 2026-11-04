// 오늘의 한 가지에서 넘어온 목표 시간과 오늘 집중한 시간을 비교한다. 화면 코드 없이 함수만 둔다.
//
// 확인용 예시
// 목표 2시간, 오늘 그 일정 기록 60분 → 남은 1시간이라 1시간을 먼저 고른다
// 목표 1.5시간, 기록 없음 → 2시간을 고른다 (시간 단위로 올림)
// 목표를 넘겼거나 4시간보다 길면 → 1시간, 4시간으로 맞춘다

export const MAX_GOAL_HOURS = 24;

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

// 남은 시간을 시간 단위로 올림해서 먼저 골라 둔다.
export function suggestHours(goal: FocusGoal, maxHours: number) {
  const remaining = goal.hours - goal.doneMinutes / 60;
  return Math.min(maxHours, Math.max(1, Math.ceil(remaining)));
}

// 주차별 막대 위의 숫자. 시간 단위, 소수 한 자리.
export function hoursLabel(minutes: number) {
  return String(Math.round((minutes / 60) * 10) / 10);
}
