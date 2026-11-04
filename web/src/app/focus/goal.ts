// 오늘의 한 가지에서 넘어온 목표 시간을 25분 집중 횟수로 바꾼다. 화면 코드 없이 함수만 둔다.
//
// 확인용 예시 (한 번 = 집중 25분 + 휴식 5분 = 30분)
// 2시간 → 4번, 1시간 → 2번, 0.5시간 → 1번, 1.2시간 → 3번(남는 시간은 한 번으로 올림)
// 2시간 목표에 오늘 그 일정 기록이 1개 있으면 → 4번 중 1번 마침

export const MAX_GOAL_HOURS = 12;

export type GoalRecord = { subject: string; finishedAt: number; deadlineId?: string; activityId?: string };
export type GoalTarget = { subject: string; link: { deadlineId?: string; activityId?: string } };
export type FocusGoal = { hours: number; rounds: number; done: number };

export function isSameDay(a: number, b: number) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

// 주소에 든 값이라 무엇이든 올 수 있다. 쓸 수 없는 값이면 null.
export function parseGoalHours(value: string | null) {
  if (!value) return null;
  const hours = Number(value);
  return Number.isFinite(hours) && hours > 0 && hours <= MAX_GOAL_HOURS ? hours : null;
}

export function roundsFor(hours: number, roundMinutes: number) {
  return Math.max(1, Math.ceil((hours * 60) / roundMinutes));
}

// 오늘 끝낸 기록 중 이 일정(또는 활동, 과목)의 것만 센다.
export function focusGoal(
  hours: number,
  records: GoalRecord[],
  now: number,
  target: GoalTarget,
  roundMinutes: number,
): FocusGoal {
  const { deadlineId, activityId } = target.link;
  const done = records.filter((record) => {
    if (!isSameDay(record.finishedAt, now)) return false;
    if (deadlineId) return record.deadlineId === deadlineId;
    if (activityId) return record.activityId === activityId;
    return record.subject === target.subject;
  }).length;
  return { hours, rounds: roundsFor(hours, roundMinutes), done };
}

// 주차별 막대 위의 숫자. 시간 단위, 소수 한 자리.
export function hoursLabel(minutes: number) {
  return String(Math.round((minutes / 60) * 10) / 10);
}
