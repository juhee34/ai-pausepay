"use client";

import { useState, type ReactNode } from "react";
import BottomSheet from "@/components/ui/bottom-sheet";
import Button from "@/components/ui/button";
import {
  addDeadlines,
  removeCourseDeadlines,
  removeDeadline,
  updateDeadline,
  useSavedDeadlines,
  type SavedDeadline,
} from "@/lib/deadline-store";
import { useGrading } from "@/lib/grading-store";
import { DEADLINE_KINDS, type DeadlineKind } from "@/lib/syllabus";
import { MAX_TASK_COURSE, MAX_TASK_MEMO, MAX_TASK_TITLE, parseTaskForm, type TaskFormErrors } from "@/lib/task-form";
import { useTimetable } from "@/lib/timetable-store";
import { DEFAULT_HOURS } from "@/lib/today-plan";

// 글자가 16px보다 작으면 아이폰이 입력할 때 화면을 확대한다.
const inputClass =
  "mt-1.5 min-h-11 w-full min-w-0 rounded-button border border-line bg-surface px-3 text-[16px] font-normal text-ink outline-none focus:border-brand";

function Optional() {
  return <span className="text-xs font-medium text-muted">(선택)</span>;
}

function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <span role="alert" className="mt-1 block text-xs font-semibold text-review">
      {children}
    </span>
  );
}

// 지우기 전에 한 번 묻는다. 할 일로 기록한 집중 시간은 그대로 남는다.
// 과목의 할 일을 모두 지운다. 지웠으면 true.
export function confirmRemoveCourse(course: string, count: number) {
  const name = course || "과목 없음";
  if (
    !window.confirm(
      `"${name}" 과목의 할 일 ${count}개를 모두 지울까요?\n홈 달력과 오늘의 한 가지에서도 사라지고 되돌릴 수 없어요.\n평가 비율·점수·공부 기록은 그대로 남아요.`,
    )
  )
    return false;
  removeCourseDeadlines(course);
  return true;
}

export function confirmRemoveTask(task: SavedDeadline) {
  if (!window.confirm(`"${task.title}" 할 일을 지울까요? 되돌릴 수 없어요.`)) return false;
  removeDeadline(task.id);
  return true;
}

// 과제·퀴즈 같은 할 일을 직접 넣거나 고치는 창. task가 있으면 고치기다.
export default function TaskFormSheet({ task, onClose }: { task?: SavedDeadline; onClose: () => void }) {
  const saved = useSavedDeadlines();
  const timetable = useTimetable();
  const grading = useGrading();

  const [course, setCourse] = useState(task?.course ?? "");
  const [title, setTitle] = useState(task?.title ?? "");
  const [kind, setKind] = useState<DeadlineKind>(task?.kind ?? "과제");
  const [startDate, setStartDate] = useState(task?.startDate ?? "");
  const [date, setDate] = useState(task?.date ?? "");
  const [hours, setHours] = useState(task?.hours === undefined ? "" : String(task.hours));
  const [memo, setMemo] = useState(task?.memo ?? "");
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [duplicate, setDuplicate] = useState(false);

  // 공고 일정의 course에는 기관 이름이 들어 있어 과목 목록에서 뺀다.
  const courseOptions = [
    ...new Set(
      [...timetable.map((c) => c.course), ...saved.filter((d) => !d.source).map((d) => d.course), ...Object.keys(grading)]
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ];

  function save(e: React.FormEvent) {
    e.preventDefault();
    const result = parseTaskForm({ course, title, kind, startDate, date, hours, memo });
    setErrors(result.errors);
    setDuplicate(false);
    if (!result.fields) return;
    if (task) {
      updateDeadline(task.id, result.fields);
      onClose();
      return;
    }
    const { added } = addDeadlines([{ ...result.fields, when: "" }]);
    if (added === 0) setDuplicate(true);
    else onClose();
  }

  return (
    <BottomSheet open onClose={onClose} title={task ? "할 일 고치기" : "할 일 넣기"}>
      <form onSubmit={save} noValidate className="space-y-3.5">
        <label className="block text-[13px] font-semibold">
          과목
          <input
            id="task-course"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            maxLength={MAX_TASK_COURSE}
            list="task-course-options"
            placeholder="예: 재무관리"
            className={inputClass}
          />
          <datalist id="task-course-options">
            {courseOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <FieldError>{errors.course}</FieldError>
        </label>

        <label className="block text-[13px] font-semibold">
          할 일 이름
          <input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={MAX_TASK_TITLE}
            placeholder="예: 3장 연습문제 과제"
            className={inputClass}
          />
          <FieldError>{errors.title}</FieldError>
        </label>

        <fieldset>
          <legend className="text-[13px] font-semibold">종류</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {DEADLINE_KINDS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                onClick={() => setKind(value)}
                className={`min-h-11 rounded-full border px-3.5 text-sm font-semibold ${
                  kind === value ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-2">
          <label className="block min-w-0 text-[13px] font-semibold">
            시작일 <Optional />
            <input
              id="task-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block min-w-0 text-[13px] font-semibold">
            마감일
            <input
              id="task-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <FieldError>{errors.startDate}</FieldError>
        <FieldError>{errors.date}</FieldError>
        <p className="text-xs text-muted">시작일이 아직 안 됐으면 그날부터 우선순위에 들어가요.</p>

        <label className="block text-[13px] font-semibold">
          예상 시간 <Optional />
          <input
            id="task-hours"
            inputMode="decimal"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder={`비우면 ${DEFAULT_HOURS[kind]}시간으로 계산해요`}
            className={inputClass}
          />
          <FieldError>{errors.hours}</FieldError>
        </label>

        <label className="block text-[13px] font-semibold">
          내용 <Optional />
          <textarea
            id="task-memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={MAX_TASK_MEMO}
            rows={3}
            placeholder="예: 5쪽 보고서, 제출은 KLAS로"
            className={`${inputClass} py-2.5`}
          />
          <FieldError>{errors.memo}</FieldError>
        </label>

        {duplicate && (
          <p role="alert" className="text-xs font-semibold text-review">
            같은 과목, 이름, 마감일의 할 일이 이미 있어요.
          </p>
        )}
        <Button type="submit" className="w-full">
          저장
        </Button>
        {task && (
          <button
            type="button"
            onClick={() => {
              if (confirmRemoveTask(task)) onClose();
            }}
            className="min-h-11 w-full rounded-button text-sm font-semibold text-review active:bg-review-soft"
          >
            이 할 일 지우기
          </button>
        )}
      </form>
    </BottomSheet>
  );
}
