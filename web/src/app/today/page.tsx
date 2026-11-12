"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Plus, Timer } from "lucide-react";
import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";
import BottomSheet from "@/components/ui/bottom-sheet";
import Button from "@/components/ui/button";
import { useToday } from "@/lib/briefing";
import { useSavedDeadlines, type SavedDeadline } from "@/lib/deadline-store";
import { getLatestAccuracy } from "@/lib/exam-results";
import { useGrades } from "@/lib/grades-store";
import { useGrading } from "@/lib/grading-store";
import { weekNumberOf } from "@/lib/risk";
import {
  DEFAULT_AVAILABLE_HOURS,
  MAX_AVAILABLE_HOURS,
  MIN_AVAILABLE_HOURS,
  exampleTasks,
  formatHours,
  groupByCourse,
  parseAvailableHours,
  planToday,
  scoreTasks,
  type EfficiencyLevel,
  type PlanTask,
  type ScoredTask,
} from "@/lib/today-plan";

import TaskFormSheet, { confirmRemoveCourse, confirmRemoveTask } from "../task-form-sheet";

const LEVEL_CLASS: Record<EfficiencyLevel, string> = {
  높음: "bg-brand-soft text-brand",
  보통: "border border-line bg-surface text-muted",
  낮음: "bg-divider text-muted",
};

function badge(className: string, label: string) {
  return (
    <span className={`inline-flex h-[22px] shrink-0 items-center rounded-full px-2 text-[11px] font-bold ${className}`}>
      {label}
    </span>
  );
}

function dDay(days: number) {
  return days === 0 ? "D-day" : `D-${days}`;
}

const URGENT_DAYS = 3;

// 마감까지 남은 날. 한눈에 보이게 크게 쓰고, 3일 안이면 포인트색으로 쓴다.
function DDay({ days }: { days: number }) {
  return (
    <span className={`shrink-0 font-mono text-lg font-bold leading-6 ${days <= URGENT_DAYS ? "text-brand" : "text-ink"}`}>
      {dDay(days)}
    </span>
  );
}

function meta(task: ScoredTask) {
  return `배점 ${Math.round(task.weight * 10) / 10}% · 약 ${formatHours(task.hours)}`;
}

// 예시 데이터의 id(ex-1 등)는 일정에 없어서 집중 모드가 과목(course)만 고른다.
function focusHref(task: ScoredTask, hours: number) {
  return `/focus?deadline=${encodeURIComponent(task.id)}&course=${encodeURIComponent(task.course)}&hours=${hours}`;
}

function headerDate(today: string) {
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString("ko-KR", { weekday: "long" });
  const week = weekNumberOf(today);
  return `${m}월 ${d}일 ${weekday}${week >= 1 && week <= 16 ? ` · ${week}주차` : ""}`;
}

export default function TodayPage() {
  const today = useToday();
  const saved = useSavedDeadlines();
  const grading = useGrading();
  const grades = useGrades();
  const [hoursText, setHoursText] = useState(String(DEFAULT_AVAILABLE_HOURS));
  // 입력하는 도중이나 잘못 넣었을 때는 마지막으로 맞게 넣은 시간을 계속 쓴다.
  const [available, setAvailable] = useState<number>(DEFAULT_AVAILABLE_HOURS);
  const hoursInvalid = parseAvailableHours(hoursText) === null;
  // fromCourse: 과목 창에서 고치러 왔으면 닫을 때 그 창으로 돌아간다.
  const [taskSheet, setTaskSheet] = useState<{ task?: SavedDeadline; fromCourse?: string } | null>(null);
  const [openCourse, setOpenCourse] = useState<string | null>(null);

  function changeHours(text: string) {
    setHoursText(text);
    const hours = parseAvailableHours(text);
    if (hours !== null) setAvailable(hours);
  }

  const isExample = saved.length === 0;

  const scored = useMemo(() => {
    if (!today) return [];
    const tasks: PlanTask[] = isExample
      ? exampleTasks(today)
      : saved
          .filter((d) => !d.done)
          .map((d) => ({
            id: d.id,
            course: d.course,
            title: d.title,
            date: d.date,
            kind: d.kind,
            hours: d.hours,
            startDate: d.startDate,
          }));
    const courses = [...new Set(tasks.map((t) => t.course))];
    const accuracy: Record<string, number> = {};
    for (const course of courses) {
      const value = isExample ? null : getLatestAccuracy(course);
      if (value !== null) accuracy[course] = value;
    }
    const targets: Record<string, number> = {};
    if (!isExample) for (const [course, g] of Object.entries(grades)) targets[course] = g.target;
    return scoreTasks(today, tasks, {
      grading: isExample ? {} : grading,
      targets,
      accuracy,
      allTasks: isExample ? [] : saved.map((d) => ({ course: d.course, kind: d.kind })),
    });
  }, [today, isExample, saved, grading, grades]);

  const plan = planToday(scored, available);
  const groups = groupByCourse(scored, plan.picks);
  // 고치다가 그 과목의 일이 모두 사라지면 찾지 못하므로 창을 열지 않는다.
  const openGroup = groups.find((g) => g.course === openCourse);
  const top = Math.max(0, ...scored.map((t) => t.efficiency));
  const [main, ...more] = plan.picks;
  // 아직 시작 전인 일은 순위 대신 따로 보여 준다. 시작이 빠른 순.
  const notStarted = today
    ? saved
        .filter((d) => !d.done && d.date >= today && d.startDate && d.startDate > today)
        .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))
    : [];

  return (
    <AppShell>
      <div className="flex min-h-7 items-center justify-between">
        <span className="text-xs font-semibold text-brand">우니스</span>
        {today && isExample && (
          <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
            예시 데이터
          </span>
        )}
      </div>

      <h1 className="mt-1 text-[22px] font-bold">오늘의 한 가지</h1>
      <p className="mt-1 min-h-5 text-[13px] text-muted">{today ? headerDate(today) : ""}</p>
      <p className="mt-1 text-[13px] text-ink/80">시간은 한정돼 있으니, 어디에 쓸지가 곧 학점이에요.</p>

      <label htmlFor="today-hours" className="mt-4 block text-xs font-semibold text-brand">
        오늘 쓸 수 있는 시간
      </label>
      <div className="mt-2 flex items-center gap-2">
        {/* 글자가 16px보다 작으면 아이폰이 입력할 때 화면을 확대한다. */}
        <input
          id="today-hours"
          inputMode="decimal"
          value={hoursText}
          onChange={(e) => changeHours(e.target.value)}
          aria-invalid={hoursInvalid}
          aria-describedby={hoursInvalid ? "today-hours-error" : undefined}
          className="min-h-11 w-24 rounded-button border border-line bg-surface px-3.5 py-2.5 font-mono text-base text-ink outline-none focus:border-brand"
        />
        <span className="text-sm font-semibold">시간</span>
        <Button variant="secondary" onClick={() => setTaskSheet({})} className="ml-auto shrink-0 !bg-surface !px-3 text-sm">
          <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
          할 일 넣기
        </Button>
      </div>
      {hoursInvalid && (
        <p id="today-hours-error" role="alert" className="mt-1.5 text-xs font-semibold text-review">
          {MIN_AVAILABLE_HOURS}시간부터 {MAX_AVAILABLE_HOURS}시간 사이 숫자로 넣어 주세요. 아래는 {formatHours(available)} 기준이에요.
        </p>
      )}

      {today && main && (
        <div className="mt-4 rounded-block bg-brand p-4 text-white">
          <p className="text-xs font-semibold text-white/80">{main.task.days === 0 ? "오늘 마감부터 먼저" : "오늘 가장 효율 좋은"} {formatHours(available)}</p>
          <div className="mt-3 border-t border-white/20 pt-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/80">{main.task.course}</p>
                <p className="mt-0.5 break-words text-[20px] font-bold leading-snug">{main.task.title}</p>
              </div>
              <span className="shrink-0 rounded-full bg-surface px-3 py-1 font-mono text-lg font-bold leading-6 text-brand">
                {dDay(main.task.days)}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-white/80">{meta(main.task)}</p>
            <p className="mt-2 text-[13px] leading-relaxed">{main.task.reason}</p>
            {main.hours < main.task.hours && (
              <p className="mt-1 text-xs text-white/80">
                오늘은 {formatHours(main.hours)}만 하고 나머지는 다음에 이어서 해요.
              </p>
            )}
            {more.map((p) => (
              <p key={p.task.id} className="mt-2 text-[13px]">
                + {p.task.course} · {p.task.title} ({formatHours(p.hours)})
              </p>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/20 pt-3">
            <p className="text-[13px]">
              {plan.used === available
                ? `${formatHours(available)}을 모두 써요`
                : `${formatHours(plan.used)} 쓰고 ${formatHours(available - plan.used)}이 남아요`}
            </p>
            <Link
              href={focusHref(main.task, main.hours)}
              className="flex min-h-11 shrink-0 items-center gap-1 rounded-button bg-surface px-3 text-[13px] font-semibold text-brand"
            >
              <Timer size={16} strokeWidth={1.8} aria-hidden="true" />
              집중 시작
            </Link>
          </div>
          {plan.deferred && (
            <div className="mt-3 rounded-button bg-white/10 p-3">
              <p className="text-xs font-semibold text-white/80">오늘 미루는 일</p>
              <p className="mt-1 text-[13px] leading-relaxed">
                {plan.deferred.course} {plan.deferred.title} ({formatHours(plan.deferred.hours)} 필요)이 오늘 미루는 일 중
                효율이 가장 높아요.
              </p>
            </div>
          )}
        </div>
      )}

      {today && !main && (
        <Block className="mt-4">
          <p className="text-[15px] font-bold">{notStarted.length > 0 ? "오늘 할 수 있는 일이 없어요" : "남은 일정이 없어요"}</p>
          <p className="mt-1 text-[13px] text-muted">할 일을 직접 넣거나 강의계획서를 넣으면 마감 전 할 일 중에서 골라 드려요.</p>
          <Link href="/calendar" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand">
            강의계획서 넣기 <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </Block>
      )}

      {groups.length > 0 && (
        <>
          <div className="mt-6 flex items-baseline justify-between px-1">
            <h2 className="text-[17px] font-bold">과목별 할 일</h2>
            <span className="text-xs text-muted">{groups.length}과목</span>
          </div>
          <p className="mt-1 px-1 text-xs leading-relaxed text-muted">
            {formatHours(available)}을 오늘 마감과 효율 높은 일부터 나눴어요. 과목을 누르면 할 일과 순위가 보여요.
          </p>
          <Block padded={false} className="mt-2 divide-y divide-divider overflow-hidden">
            {groups.map((group) => (
              <button
                key={group.course}
                type="button"
                aria-haspopup="dialog"
                onClick={() => setOpenCourse(group.course)}
                className="flex min-h-14 w-full items-center gap-2 px-3.5 py-3 text-left active:bg-divider"
              >
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-[15px] font-bold">{group.course || "과목 없음"}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    할 일 <span className="font-mono">{group.tasks.length}</span>개 ·{" "}
                    {group.hours > 0 ? `오늘 ${formatHours(group.hours)}` : "오늘은 미뤄요"}
                  </span>
                </span>
                <DDay days={group.nearestDays} />
                <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted" />
              </button>
            ))}
          </Block>
        </>
      )}

      {openGroup && (
        <BottomSheet open onClose={() => setOpenCourse(null)} title={openGroup.course || "과목 없음"}>
          <p className="-mt-1 text-xs text-muted">
            할 일 <span className="font-mono">{openGroup.tasks.length}</span>개 ·{" "}
            {openGroup.hours > 0 ? `오늘 ${formatHours(openGroup.hours)}` : "오늘은 미뤄요"}
          </p>
          <ul className="mt-1 divide-y divide-divider">
            {openGroup.tasks.map(({ task: t, rank, hours }) => {
              const savedTask = saved.find((d) => d.id === t.id);
              const canFocus = hours !== undefined && t.id !== main?.task.id;
              return (
                <li key={t.id} className="py-3">
                  <div className="flex items-start gap-2.5">
                    <span
                      aria-label={`${rank}위`}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${
                        rank === 1 ? "bg-brand text-white" : "bg-divider text-ink"
                      }`}
                    >
                      {rank}
                    </span>
                    <p className="min-w-0 flex-1 break-words text-[15px] font-bold">{t.title}</p>
                    <DDay days={t.days} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {hours !== undefined
                      ? badge("bg-brand text-white", `오늘 ${formatHours(hours)}`)
                      : badge("bg-divider text-muted", "오늘은 미뤄요")}
                    {badge(LEVEL_CLASS[t.level], `효율 ${t.level}`)}
                  </div>
                  <p className="mt-1.5 font-mono text-xs text-muted">{meta(t)}</p>
                  {savedTask?.memo && (
                    <p className="mt-1 whitespace-pre-line break-words text-xs leading-relaxed text-muted">{savedTask.memo}</p>
                  )}
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-divider">
                    <div
                      className={`h-full rounded-full ${rank === 1 ? "bg-brand" : "bg-[#A89BB0]"}`}
                      style={{ width: `${top > 0 ? Math.max((t.efficiency / top) * 100, 4) : 0}%` }}
                    />
                  </div>
                  {(canFocus || savedTask) && (
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      {/* 오늘의 첫 번째 일은 위쪽 블록의 '집중 시작'으로 시작한다. */}
                      {canFocus ? (
                        <Link
                          href={focusHref(t, hours)}
                          className="flex min-h-11 items-center gap-1 text-[13px] font-semibold text-brand"
                        >
                          <Timer size={16} strokeWidth={1.8} aria-hidden="true" />이 일로 집중 시작
                        </Link>
                      ) : (
                        <span />
                      )}
                      {savedTask && (
                        <span className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            aria-label={`${t.title} 지우기`}
                            onClick={() => confirmRemoveTask(savedTask)}
                            className="min-h-11 px-1.5 text-[13px] font-semibold text-review"
                          >
                            지우기
                          </button>
                          <button
                            type="button"
                            aria-label={`${t.title} 고치기`}
                            onClick={() => {
                              setOpenCourse(null);
                              setTaskSheet({ task: savedTask, fromCourse: openGroup.course });
                            }}
                            className="min-h-11 px-1.5 text-[13px] font-semibold text-muted"
                          >
                            고치기
                          </button>
                        </span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {/* 저장한 할 일이 있는 과목만 통째로 지울 수 있다 (예시 데이터는 저장하지 않으므로 빼고). */}
          {(() => {
            const courseTasks = saved.filter((d) => d.course === openGroup.course);
            if (isExample || courseTasks.length === 0) return null;
            return (
              <div className="mt-2 border-t border-divider pt-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (confirmRemoveCourse(openGroup.course, courseTasks.length)) setOpenCourse(null);
                  }}
                  className="w-full !text-review"
                >
                  이 과목 할 일 모두 지우기 ({courseTasks.length}개)
                </Button>
                <p className="mt-1.5 text-center text-[11px] text-muted">
                  끝낸 일·시작 전인 일까지 지워요. 평가 비율·점수는 남아요.
                </p>
              </div>
            );
          })()}
        </BottomSheet>
      )}

      {notStarted.length > 0 && (
        <>
          <div className="mt-6 flex items-baseline justify-between px-1">
            <h2 className="text-[17px] font-bold">아직 시작 전</h2>
            <span className="text-xs text-muted">시작일부터 순위에 들어가요</span>
          </div>
          <Block padded={false} className="mt-2 divide-y divide-divider">
            {notStarted.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-label={`${d.title} 고치기`}
                onClick={() => setTaskSheet({ task: d })}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left active:bg-divider"
              >
                <span className="min-w-0 break-words text-sm font-medium">
                  {d.course} · {d.title}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {Number((d.startDate ?? "").slice(5, 7))}/{Number((d.startDate ?? "").slice(8))} 시작
                </span>
              </button>
            ))}
          </Block>
        </>
      )}

      <Link
        href="/grades"
        className="mt-4 flex min-h-11 w-full items-center justify-between rounded-button border border-brand bg-surface px-4 text-sm font-semibold text-brand active:bg-brand-soft"
      >
        목표 점수까지 몇 점 필요한지 보기
        <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
      </Link>

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        효율 = 배점 × (목표 − 예상 득점률) ÷ 예상 소요시간이고, 마감이 3일 안이면 ×1.3, 7일 안이면 ×1.15를 곱해요. 배점은
        강의계획서의 평가 비율을 같은 종류 일정 수로 나눈 값이고, 없으면 중간·기말 30, 과제 10, 퀴즈·기타 5로 잡아요. 예상
        득점률은 시험 대비 팩의 퀴즈 정답률이나 0.6, 목표는 기말 필요 점수에서 정한 점수나 90점이에요. 예상 소요시간은 시험
        8시간, 과제 3시간, 퀴즈·기타 1시간이고, 직접 넣은 예상 시간이 있으면 그 값을 써요. 시작일이 아직 안 된 일은 순위에서 빼요. 오늘 마감인 일은 효율과 상관없이 맨 앞에 두고, 그다음은 효율 높은 순이에요. 오늘 시간은 앞에서부터 예상 소요시간만큼 나누고, 모자라면 남은 시간만큼만 넣어요. 이 값은 순서와 시간을 정하는 데만 쓰고 점수를 예측하지는 않아요.
        {isExample && " 화면의 숫자는 모두 예시 데이터예요."}
      </p>

      {taskSheet && (
        <TaskFormSheet
          task={taskSheet.task}
          onClose={() => {
            setOpenCourse(taskSheet.fromCourse ?? null);
            setTaskSheet(null);
          }}
        />
      )}
    </AppShell>
  );
}
