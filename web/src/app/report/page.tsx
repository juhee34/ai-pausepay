"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { getData, getServerData, subscribeData } from "@/app/focus/store";
import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";
import BottomSheet from "@/components/ui/bottom-sheet";
import { useToday } from "@/lib/briefing";
import { useSavedDeadlines } from "@/lib/deadline-store";
import {
  CREDIT_CHOICES,
  DEFAULT_CREDITS,
  EXAMPLE_COURSES,
  LETTER_GRADES,
  MAX_GPA,
  MIN_REPORT_WEEKS,
  SEMESTER_LABEL,
  buildCourseReport,
  collectCourseInputs,
  formatHours,
  isSemesterOver,
  recordedWeeks,
  reportWeek,
  semesterRecords,
  type CourseBadge,
  type CourseReport,
  type LetterGrade,
  type SemesterCourse,
} from "@/lib/semester-report";
import { setSemesterCourse, useSemesterData } from "@/lib/semester-store";
import { useTimetable } from "@/lib/timetable-store";

const BADGES: Record<CourseBadge, { label: string; className: string }> = {
  best: { label: "가성비 1위", className: "bg-brand-soft text-brand" },
  worst: { label: "시간 대비 낮음", className: "border border-review-line bg-review-soft text-review" },
  "no-record": { label: "기록 없음", className: "bg-divider text-muted" },
  "no-grade": { label: "성적 넣기", className: "border border-review-line bg-review-soft text-review" },
};

const PILL = "inline-flex h-[22px] shrink-0 items-center rounded-full px-2 text-[11px] font-bold";

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`h-10 min-w-11 rounded-full border px-3.5 text-sm font-semibold ${
        selected ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function CourseCardBody({ course, rank }: { course: CourseReport; rank: number | null }) {
  const badge = course.badge && BADGES[course.badge];
  return (
    <>
      <div className="flex items-center gap-1.5">
        {rank !== null && <span className="shrink-0 font-mono text-xs text-muted">{rank}</span>}
        <span className="min-w-0 flex-1 break-words text-[15px] font-bold">{course.course}</span>
        {badge && <span className={`${PILL} ${badge.className}`}>{badge.label}</span>}
        {course.grade && <span className={`${PILL} bg-divider font-mono text-ink`}>{course.grade}</span>}
      </div>
      <p className="mt-1 text-xs text-muted">
        {course.credits}학점 · {formatHours(course.hours)}시간 · 학점당 {formatHours(course.hoursPerCredit)}시간
      </p>
      <div className="mt-2 flex items-center gap-2.5">
        <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-divider">
          <span
            className={`block h-full rounded-full ${course.badge === "best" ? "bg-brand" : "bg-[#A89BB0]"}`}
            style={{ width: `${course.barPercent}%` }}
          />
        </span>
        <span className="shrink-0 text-xs text-muted">
          가성비 <span className="font-mono font-semibold text-ink">{course.value ?? "-"}</span>
        </span>
      </div>
    </>
  );
}

function CourseSheet({
  course,
  value,
  onClose,
}: {
  course: string;
  value: SemesterCourse;
  onClose: () => void;
}) {
  const update = (next: SemesterCourse) => setSemesterCourse(course, next);
  const setGrade = (grade?: LetterGrade) => update({ credits: value.credits, ...(grade ? { grade } : {}) });
  const setCredits = (credits: number) => update({ credits, ...(value.grade ? { grade: value.grade } : {}) });

  return (
    <BottomSheet open onClose={onClose} title={course}>
      <h3 className="text-sm font-semibold">학점</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {CREDIT_CHOICES.map((credits) => (
          <Chip key={credits} selected={value.credits === credits} onClick={() => setCredits(credits)}>
            {credits}학점
          </Chip>
        ))}
        <Chip selected={value.credits === 0} onClick={() => setCredits(0)}>
          결산에서 빼기
        </Chip>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">토익처럼 학점이 없는 공부는 결산에서 빼 주세요.</p>

      <h3 className="mt-4 text-sm font-semibold">예상 성적</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {LETTER_GRADES.map((grade) => (
          <Chip key={grade} selected={value.grade === grade} onClick={() => setGrade(grade)}>
            <span className="font-mono">{grade}</span>
          </Chip>
        ))}
        <Chip selected={value.grade === undefined} onClick={() => setGrade()}>
          아직 몰라요
        </Chip>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 min-h-11 w-full rounded-button bg-brand text-sm font-semibold text-white active:bg-brand-strong"
      >
        닫기
      </button>
    </BottomSheet>
  );
}

// 학기 결산서: 집중 모드 시간과 학점·예상 성적으로 학점당 시간과 과목별 가성비를 코드로 계산한다.
export default function ReportPage() {
  const today = useToday();
  const deadlines = useSavedDeadlines();
  const timetable = useTimetable();
  const settings = useSemesterData();
  const focus = useSyncExternalStore(subscribeData, getData, getServerData);
  const [editing, setEditing] = useState<string | null>(null);

  const records = semesterRecords(focus.records, deadlines);
  const weeks = recordedWeeks(records);
  const isExample = weeks < MIN_REPORT_WEEKS;
  const report = buildCourseReport(
    isExample ? EXAMPLE_COURSES : collectCourseInputs(timetable, deadlines, records, settings),
  );
  const over = isExample || (today !== null && isSemesterOver(today));
  const lastWeek = isExample || !today ? 16 : reportWeek(today);
  let rank = 0;

  const editingValue = editing
    ? Object.hasOwn(settings, editing)
      ? settings[editing]
      : { credits: DEFAULT_CREDITS }
    : null;

  return (
    <AppShell>
      <div className="flex min-h-7 items-center justify-between px-1">
        <p className="text-xs font-semibold text-brand">우니스</p>
        {today && isExample && (
          <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
            예시 데이터
          </span>
        )}
      </div>

      <h1 className="mt-1 text-[22px] font-bold">학기 결산서</h1>
      <p className="mt-1 text-[13px] text-muted">
        {SEMESTER_LABEL} · 1~{lastWeek}주차 · 집중 모드 기록 기준
      </p>

      {today && isExample && (
        <p className="mt-3 rounded-callout border border-review-line bg-review-soft p-3 text-xs leading-relaxed text-review">
          집중 기록이 {MIN_REPORT_WEEKS}주치 쌓이면 내 결산서로 바뀌어요. 지금은 {weeks}주치예요.{" "}
          <Link href="/focus" className="font-semibold underline">
            집중 모드 시작
          </Link>
        </p>
      )}

      <div className="mt-3 rounded-block bg-brand p-4 text-white">
        <p className="text-xs font-semibold text-white/80">이번 학기 한 줄 결산</p>
        <p className="mt-2 text-xl font-bold leading-snug">
          {over ? "" : "지금까지 "}
          <span className="font-mono">{formatHours(report.totalHours)}</span>시간을 쓰고,
          <br />
          <span className="font-mono">{report.earnedCredits}</span>학점을 {over ? "얻었어요" : "듣고 있어요"}
        </p>
        <div className="mt-3 flex items-end justify-between gap-3 border-t border-white/25 pt-3">
          <p className="shrink-0">
            <span className="font-mono text-[40px] font-bold leading-none">
              {report.hoursPerCredit === null ? "-" : formatHours(report.hoursPerCredit)}
            </span>
            <span className="ml-1.5 text-[15px] font-bold">시간</span>
          </p>
          <p className="text-right text-xs leading-relaxed text-white/80">
            {over ? "학점 1개를 얻는 데 든 평균 시간" : "학점 1개에 쓴 평균 시간"}
          </p>
        </div>
      </div>

      <Block className="mt-3">
        <h2 className="text-xs font-bold text-brand">투입</h2>
        <div className="mt-1.5 flex items-baseline justify-between gap-3 border-b border-divider pb-2.5 text-sm">
          <span>집중 모드 누적</span>
          <span>
            <span className="font-mono font-semibold">{formatHours(report.totalHours)}</span>시간
          </span>
        </div>
        <h2 className="mt-2.5 text-xs font-bold text-brand">성과</h2>
        <div className="mt-1.5 flex items-baseline justify-between gap-3 border-b border-divider pb-2.5 text-sm">
          <span>{over ? "이수 학점" : "듣는 학점"}</span>
          <span>
            <span className="font-mono font-semibold">{report.earnedCredits}</span>학점
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-b border-divider py-2.5 text-sm">
          <span>예상 평점</span>
          {report.gpa === null ? (
            <span className="text-xs text-muted">과목에 성적을 넣어 주세요</span>
          ) : (
            <span className="font-mono font-semibold">
              {report.gpa.toFixed(2)} / {MAX_GPA}
            </span>
          )}
        </div>
        <h2 className="mt-2.5 text-xs font-bold text-brand">효율</h2>
        <div className="mt-1.5 flex items-baseline justify-between gap-3 text-sm font-bold">
          <span>학점당 투입 시간</span>
          <span>
            <span className="font-mono">{report.hoursPerCredit === null ? "-" : formatHours(report.hoursPerCredit)}</span>
            시간
          </span>
        </div>
      </Block>

      <div className="mt-5 flex items-baseline justify-between px-1">
        <h2 className="text-[17px] font-bold">과목별 가성비</h2>
        <span className="text-xs text-muted">높은 순</span>
      </div>
      {!isExample && <p className="mt-1 px-1 text-xs text-muted">과목을 누르면 학점과 예상 성적을 고칠 수 있어요.</p>}

      {report.courses.length === 0 ? (
        <Block className="mt-2 text-sm text-muted">결산에 넣을 과목이 없어요.</Block>
      ) : (
        <ul className="mt-2 space-y-2">
          {report.courses.map((course) => {
            const shownRank = course.value === null ? null : ++rank;
            return (
              <li key={course.course}>
                {isExample ? (
                  <Block>
                    <CourseCardBody course={course} rank={shownRank} />
                  </Block>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(course.course)}
                    aria-label={`${course.course} 학점과 예상 성적 고치기`}
                    className="block w-full rounded-block bg-surface p-3.5 text-left active:bg-divider"
                  >
                    <CourseCardBody course={course} rank={shownRank} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {report.excluded.length > 0 && (
        <Block className="mt-2">
          <h3 className="text-xs font-semibold text-muted">결산에서 뺀 과목</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {report.excluded.map((course) => (
              <Chip key={course} selected={false} onClick={() => setEditing(course)}>
                {course}
              </Chip>
            ))}
          </div>
        </Block>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        가성비 지수 = 예상 평점 ÷ 학점당 투입 시간 × 100. 과목 난이도와 평가 방식은 반영하지 않아요. 평점은 직접 입력한 예상 성적 기준이고, 집중 모드를 켠
        시간만 세어서 실제 공부 시간과 다를 수 있어요. 학점을 넣지 않은 과목은 {DEFAULT_CREDITS}학점으로 보고, 학점당 투입 시간에는 기록 없는 과목의 학점도
        들어가요.
        {isExample && " 화면의 숫자는 모두 예시 데이터예요."}
      </p>

      {editing && editingValue && (
        <CourseSheet course={editing} value={editingValue} onClose={() => setEditing(null)} />
      )}
    </AppShell>
  );
}
