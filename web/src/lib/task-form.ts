// 할 일 직접 넣기 창의 입력 검사. 화면 코드 없이 함수만 둔다.

import type { DeadlineKind } from "./syllabus";

export const MAX_TASK_TITLE = 60;
export const MAX_TASK_COURSE = 30;
export const MAX_TASK_MEMO = 300;
export const MIN_TASK_HOURS = 0.5;
export const MAX_TASK_HOURS = 100;

export type TaskFormInput = {
  course: string;
  title: string;
  kind: DeadlineKind;
  startDate: string;
  date: string;
  hours: string;
  memo: string;
};

export type TaskFields = {
  course: string;
  title: string;
  kind: DeadlineKind;
  date: string;
  startDate?: string;
  hours?: number;
  memo?: string;
};

export type TaskFormErrors = Partial<Record<"course" | "title" | "date" | "startDate" | "hours" | "memo", string>>;

const YMD = /^\d{4}-\d{2}-\d{2}$/;

// 문제가 없으면 저장할 값을, 있으면 칸별 안내를 돌려준다. 비운 선택 칸은 값에 넣지 않는다.
export function parseTaskForm(input: TaskFormInput): { fields: TaskFields | null; errors: TaskFormErrors } {
  const errors: TaskFormErrors = {};
  const course = input.course.trim();
  const title = input.title.trim();
  const memo = input.memo.trim();
  const hoursText = input.hours.trim();
  const hours = Number(hoursText);

  if (!course) errors.course = "과목을 넣어 주세요.";
  else if (course.length > MAX_TASK_COURSE) errors.course = `과목은 ${MAX_TASK_COURSE}자까지 넣을 수 있어요.`;
  if (!title) errors.title = "할 일 이름을 넣어 주세요.";
  else if (title.length > MAX_TASK_TITLE) errors.title = `이름은 ${MAX_TASK_TITLE}자까지 넣을 수 있어요.`;
  if (!YMD.test(input.date)) errors.date = "마감일을 골라 주세요.";
  if (input.startDate && !YMD.test(input.startDate)) errors.startDate = "시작일을 다시 골라 주세요.";
  else if (input.startDate && !errors.date && input.startDate > input.date) {
    errors.startDate = "시작일이 마감일보다 늦어요.";
  }
  if (hoursText && !(Number.isFinite(hours) && hours >= MIN_TASK_HOURS && hours <= MAX_TASK_HOURS)) {
    errors.hours = `예상 시간은 ${MIN_TASK_HOURS}시간부터 ${MAX_TASK_HOURS}시간까지 숫자로 넣어 주세요.`;
  }
  if (memo.length > MAX_TASK_MEMO) errors.memo = `내용은 ${MAX_TASK_MEMO}자까지 넣을 수 있어요.`;

  if (Object.keys(errors).length > 0) return { fields: null, errors };
  return {
    fields: {
      course,
      title,
      kind: input.kind,
      date: input.date,
      ...(input.startDate ? { startDate: input.startDate } : {}),
      ...(hoursText ? { hours: Math.round(hours * 10) / 10 } : {}),
      ...(memo ? { memo } : {}),
    },
    errors,
  };
}
