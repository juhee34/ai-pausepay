"use client";

import { ChevronLeft, FileUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";
import Button from "@/components/ui/button";
import SegmentedTabs from "@/components/ui/segmented-tabs";
import { useToday } from "@/lib/briefing";
import { downloadCalendarFile } from "@/lib/calendar-file";
import { dateCandidates } from "@/lib/date-candidates";
import { addDeadlines } from "@/lib/deadline-store";
import { setCourseGrading, useGrading } from "@/lib/grading-store";
import {
  ACCEPTED_TYPES,
  GRADING_NAMES,
  MAX_UPLOAD_BYTES,
  isAcceptedType,
  reviewGrading,
  type Deadline,
  type GradingDraft,
  type SyllabusGrading,
} from "@/lib/syllabus";
import { useTimetable } from "@/lib/timetable-store";
import EditSheet from "./edit-sheet";
import GradingReview, { SavedGrading } from "./grading-review";
import MonthCalendar, { type DotKind } from "./month-calendar";
import ReviewList, { type Draft } from "./review-list";

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// 강의계획서 → 캘린더. 올리기 → AI가 찾은 일정 확인·수정 → 이 폰에 저장 + .ics 내려받기.
// 저장한 일정은 홈의 달력과 목록에서 본다.
export default function CalendarPage() {
  const today = useToday();
  const timetable = useTimetable();
  const savedGrading = useGrading();
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "month">("month");
  const [month, setMonth] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [gradingCourse, setGradingCourse] = useState("");
  const [gradingDrafts, setGradingDrafts] = useState<GradingDraft[]>([]);
  const gradingReview = reviewGrading(gradingDrafts);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    // 같은 파일을 다시 골라도 반응하도록 선택 칸을 비운다.
    e.target.value = "";
    if (!picked) return;

    setNotice(null);
    if (!isAcceptedType(picked.type)) {
      setFile(null);
      setError("PDF나 PNG·JPG 이미지만 올릴 수 있어요.");
      return;
    }
    if (picked.size > MAX_UPLOAD_BYTES) {
      setFile(null);
      setError(
        `파일이 너무 커요 (${formatSize(picked.size)}). 4MB 이하로 줄이거나, 필요한 쪽만 저장해서 올려 주세요.`,
      );
      return;
    }
    setError(null);
    setFile(picked);
  }

  async function findDeadlines() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/syllabus", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error ?? "일정을 찾지 못했어요. 잠시 뒤에 다시 해 주세요.");
        return;
      }
      const found = data.deadlines as Deadline[];
      const grading: SyllabusGrading[] = data.grading ?? [];
      if (found.length === 0 && grading.length === 0) {
        setError("일정과 평가 비율을 찾지 못했어요. 다른 쪽이나 캡쳐로 다시 해 보세요.");
        return;
      }
      const course = data.course || found.find((item) => item.course)?.course || "";
      setGradingCourse(course);
      setGradingDrafts(GRADING_NAMES.map((name) => {
        const item = grading.find((entry) => entry.name === name);
        return { name, weight: item ? String(item.weight) : "" };
      }));
      // 달력은 오늘 이후 첫 일정이 있는 달부터 보여 준다.
      const firstUpcoming = found.find((d) => d.date && today && d.date >= today)?.date;
      setMonth((firstUpcoming ?? today ?? found.find((d) => d.date)?.date ?? "").slice(0, 7));
      setFileName(file.name);
      setDrafts(found.map((d) => ({ ...d, course: d.course || course, key: crypto.randomUUID(), checked: true })));
      setFile(null);
    } catch {
      setError("인터넷 연결을 확인하고 다시 해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  function addToCalendar() {
    if (!drafts) return;
    const chosen = drafts.filter((d) => d.checked);
    // 날짜가 정해지지 않은 일정이 있으면 그 일정의 날짜 고르기부터
    const undated = chosen.find((d) => !d.date);
    if (undated) {
      setEditing(undated.key);
      return;
    }
    const course = gradingCourse.trim();
    const hasGrading = gradingReview.items.length > 0;
    if (gradingReview.invalid || (hasGrading && !course)) {
      setError("평가 비율은 0~100 사이 숫자로, 과목명은 빈칸 없이 넣어 주세요.");
      return;
    }
    if (chosen.length === 0 && !hasGrading) return;
    const previous = Object.hasOwn(savedGrading, course) ? savedGrading[course] : undefined;
    if (hasGrading && previous?.length && JSON.stringify(previous) !== JSON.stringify(gradingReview.items)) {
      if (!confirm(`${course}의 평가 비율이 이미 있어요. 확인한 비율로 바꿀까요? 받은 점수는 그대로 남아요.`)) return;
    }
    setError(null);
    let added = 0;
    let saved: ReturnType<typeof addDeadlines>["saved"] = [];
    try {
      // 실패하면 확인 화면을 유지한다. 재시도해도 이미 저장한 일정은 중복 추가하지 않는다.
      if (chosen.length > 0) {
        ({ added, saved } = addDeadlines(chosen.map((d) => ({
          course: d.course.trim(), title: d.title.trim() || d.kind,
          date: d.date!, when: d.when, kind: d.kind,
        }))));
      }
      if (hasGrading) setCourseGrading(course, gradingReview.items);
    } catch {
      setError("저장을 마치지 못했어요. 일부 일정은 저장됐을 수 있으니, 저장 공간을 확인하고 다시 눌러 주세요.");
      return;
    }
    let message = hasGrading ? `${course} 평가 비율을 저장했어요.` : "";
    if (chosen.length > 0) {
      message += ` 일정 ${added}개를 새로 저장했어요.`;
      if (chosen.length > added) message += ` 이미 있던 ${chosen.length - added}개는 건너뛰었어요.`;
      try {
        downloadCalendarFile(saved);
        message += " 캘린더 파일을 내려받았어요.";
      } catch {
        setError("일정은 저장했지만 캘린더 파일을 만들지 못했어요. 홈의 '다시 받기'를 눌러 주세요.");
      }
    }
    setNotice(message.trim());
    setDrafts(null);
  }

  const editingDraft = drafts?.find((d) => d.key === editing) ?? null;

  if (drafts && today) {
    const checkedCount = drafts.filter((d) => d.checked).length;
    const marks = drafts.flatMap((d): { date: string; kind: DotKind }[] => {
      if (d.date) return [{ date: d.date, kind: d.kind }];
      // 확인 필요 일정은 첫 날짜 후보에 주황 점
      const first = dateCandidates(`${d.when} ${d.title}`, d.course, timetable)[0];
      return first ? [{ date: first.date, kind: "확인 필요" }] : [];
    });

    return (
      <AppShell>
        <header className="mb-4 flex items-start gap-2">
          <button
            type="button"
            aria-label="올리기로 돌아가기"
            onClick={() => {
              if (confirm("찾은 일정을 버리고 돌아갈까요?")) setDrafts(null);
            }}
            className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink active:bg-divider"
          >
            <ChevronLeft size={22} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="text-[22px] font-bold leading-tight">찾은 일정 {drafts.length}개</h1>
            <p className="truncate text-xs text-muted">{fileName}</p>
          </div>
          <SegmentedTabs
            label="보기 방식"
            options={[
              { value: "list", label: "목록" },
              { value: "month", label: "달력" },
            ]}
            value={view}
            onChange={setView}
          />
        </header>

        {view === "month" && (
          <MonthCalendar
            month={month}
            today={today}
            marks={marks}
            onMonthChange={setMonth}
            onSelectDate={(date) => {
              const target = drafts.find((d) => d.date === date);
              document
                .getElementById(`draft-${target?.key}`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
        )}

        <ReviewList drafts={drafts} month={month} onChange={setDrafts} onEdit={setEditing} />
        <GradingReview
          course={gradingCourse}
          drafts={gradingDrafts}
          onCourseChange={(course) => {
            setDrafts(drafts.map((draft) => draft.course === gradingCourse ? { ...draft, course } : draft));
            setGradingCourse(course);
          }}
          onChange={setGradingDrafts}
        />
        <p className="mt-3 px-1 text-xs leading-relaxed text-muted">
          AI가 찾은 결과라 틀릴 수 있어요. 원본과 날짜를 꼭 비교해 주세요. 일정 이름을 누르면 고칠 수 있어요.
        </p>
        {error && (
          <p role="alert" className="mt-3 rounded-callout border border-review-line bg-review-soft p-3.5 text-sm text-review">
            {error}
          </p>
        )}

        {/* 아래 고정 바가 마지막 내용을 가리지 않게 */}
        <div className="h-24" aria-hidden="true" />
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 border-t border-line bg-surface">
          <div className="mx-auto max-w-[480px] px-4 py-2.5">
            <Button className="w-full" disabled={
              (checkedCount === 0 && gradingReview.items.length === 0) || gradingReview.invalid ||
              (gradingReview.items.length > 0 && !gradingCourse.trim())
            } onClick={addToCalendar}>
              <span>
                {checkedCount > 0 ? <><span className="font-mono">{checkedCount}</span>개 일정{gradingReview.items.length > 0 ? "·평가 비율 저장" : " 캘린더에 추가"}</> : "평가 비율 저장"}
              </span>
            </Button>
            <p className="mt-1 text-center text-[11px] text-muted">{checkedCount > 0 ? ".ics 파일로 받아요 · 하루 전 알림 포함" : "확인한 비율을 이 폰에 저장해요"}</p>
          </div>
        </div>

        <EditSheet
          draft={editingDraft}
          onClose={() => setEditing(null)}
          onRemove={() => {
            setDrafts(drafts.filter((d) => d.key !== editing));
            setEditing(null);
          }}
          onSave={(patch) => {
            setDrafts(drafts.map((d) => (d.key === editing ? { ...d, ...patch, checked: true } : d)));
            setEditing(null);
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link href="/" className="-ml-1 mb-1 flex min-h-11 w-fit items-center gap-0.5 pr-2 text-xs font-semibold text-brand">
        <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
        홈
      </Link>
      <p className="px-1 text-xs font-medium text-muted">강의계획서 → 캘린더</p>
      <h1 className="px-1 text-[22px] font-bold">한 장으로 한 학기 일정</h1>
      <p className="mt-1 px-1 text-sm text-muted">
        강의계획서 PDF나 KLAS 화면 캡쳐를 올리면 과제·퀴즈·시험 날짜와 성적 평가 비율을 찾아 드려요.
      </p>

      <Block className="mt-6">
        <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-button bg-canvas px-4 py-3 text-[15px] font-semibold active:bg-divider">
          <FileUp size={20} strokeWidth={1.8} aria-hidden="true" />
          파일 고르기
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            disabled={loading}
            onChange={handleFile}
            className="sr-only"
          />
        </label>
        <p className="mt-2 text-center text-xs text-muted">PDF · PNG · JPG, 4MB까지</p>

        {file && (
          <div className="mt-3 border-t border-divider pt-3">
            <p className="truncate text-sm font-semibold">{file.name}</p>
            <p className="font-mono text-xs text-muted">{formatSize(file.size)}</p>
            <Button className="mt-3 w-full" onClick={findDeadlines} disabled={loading}>
              {loading ? "일정 찾는 중… (10~30초)" : "AI로 일정 찾기"}
            </Button>
          </div>
        )}
      </Block>

      <p className="mt-3 px-1 text-xs leading-relaxed text-muted">
        올린 파일은 서버에 저장하지 않고, 내 일정을 찾는 데만 써요. 강의자료는 나만 보고 다른 사람과 공유하지 마세요.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-callout border border-review-line bg-review-soft p-3.5 text-sm text-review">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 rounded-callout bg-brand-soft p-3.5 text-sm font-semibold text-brand">
          {notice}{" "}
          <Link href="/" className="underline">
            홈 달력에서 보기
          </Link>
        </p>
      )}
      <SavedGrading />
    </AppShell>
  );
}
