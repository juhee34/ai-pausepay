"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import BottomSheet from "@/components/ui/bottom-sheet";
import Button from "@/components/ui/button";
import {
  ACTIVITY_KINDS,
  ACTIVITY_STAGES,
  MAX_ACTIVITY_TEXT,
  MAX_ACTIVITY_TITLE,
  STAGE_LABEL,
  addActivityCard,
  removeActivity,
  setActivityStage,
  stageOf,
  updateActivity,
  type Activity,
  type ActivityKind,
  type ActivityStage,
} from "@/lib/activity-store";
import { formatKoreanDate } from "@/lib/day-plan";

// 글자가 16px보다 작으면 아이폰이 입력할 때 화면을 확대한다.
const inputClass =
  "mt-1.5 min-h-11 w-full min-w-0 rounded-button border border-line bg-surface px-3 text-[16px] text-ink outline-none focus:border-brand";

export function formatPeriod(a: Pick<Activity, "startDate" | "endDate">) {
  const short = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8))}`;
  if (a.startDate && a.endDate) return `${short(a.startDate)} ~ ${short(a.endDate)}`;
  if (a.startDate) return `${short(a.startDate)}부터`;
  if (a.endDate) return `${short(a.endDate)}까지`;
  return "";
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-3.5 text-sm font-semibold ${
        active ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink"
      }`}
    >
      {children}
    </button>
  );
}

// 추가·수정 창. activity가 있으면 수정이다.
export function ActivityFormSheet({
  activity,
  defaultStage,
  onClose,
  onSaved,
}: {
  activity?: Activity;
  defaultStage: ActivityStage;
  onClose: () => void;
  onSaved: (stage: ActivityStage) => void;
}) {
  const [title, setTitle] = useState(activity?.title ?? "");
  const [org, setOrg] = useState(activity?.org ?? "");
  const [kind, setKind] = useState<ActivityKind | undefined>(activity?.kind);
  const [role, setRole] = useState(activity?.role ?? "");
  const [stage, setStage] = useState<ActivityStage>(activity ? stageOf(activity) : defaultStage);
  const [date, setDate] = useState(activity?.date ?? "");
  const [startDate, setStartDate] = useState(activity?.startDate ?? "");
  const [endDate, setEndDate] = useState(activity?.endDate ?? "");

  const periodError = startDate && endDate && endDate < startDate;
  const canSave = title.trim() !== "" && date !== "" && !periodError;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    // 비운 칸은 undefined라서 저장할 때 빠진다.
    const fields = {
      title: title.trim(),
      date,
      stage,
      kind,
      org: org.trim() || undefined,
      role: role.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };
    if (activity) updateActivity(activity.id, fields);
    else addActivityCard(fields);
    onSaved(stage);
  }

  return (
    <BottomSheet open onClose={onClose} title={activity ? "활동 고치기" : "직접 추가"}>
      {!activity && (
        <p className="-mt-1 mb-3 rounded-callout bg-canvas p-3 text-[13px] leading-relaxed text-muted">
          공고 없이 직접 적는 활동이에요. 공고·자격증 안내가 있으면{" "}
          <Link href="/career/posting" className="font-semibold text-brand underline">
            공고·자격증 올리기
          </Link>
          에서 마감을 찾아 일정까지 한 번에 넣을 수 있어요.
        </p>
      )}
      <form onSubmit={save} className="space-y-3.5">
        <label className="block text-[13px] font-semibold">
          이름
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={MAX_ACTIVITY_TITLE}
            placeholder="예: 대학생 서포터즈 12기"
            className={inputClass}
          />
        </label>
        <label className="block text-[13px] font-semibold">
          다음 마감
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
          <span className="mt-1 block text-xs font-normal text-muted">
            홈 달력과 그날 일정에도 보여요.
          </span>
        </label>

        <fieldset>
          <legend className="text-[13px] font-semibold">단계</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {ACTIVITY_STAGES.map((value) => (
              <Chip key={value} active={stage === value} onClick={() => setStage(value)}>
                {STAGE_LABEL[value]}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[13px] font-semibold">
            종류 <span className="text-xs font-medium text-muted">(선택)</span>
          </legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {ACTIVITY_KINDS.map((value) => (
              <Chip
                key={value}
                active={kind === value}
                onClick={() => setKind(kind === value ? undefined : value)}
              >
                {value}
              </Chip>
            ))}
          </div>
        </fieldset>

        <label className="block text-[13px] font-semibold">
          기관 <span className="text-xs font-medium text-muted">(선택)</span>
          <input
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            maxLength={MAX_ACTIVITY_TEXT}
            className={inputClass}
          />
        </label>
        <label className="block text-[13px] font-semibold">
          역할 <span className="text-xs font-medium text-muted">(선택)</span>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            maxLength={MAX_ACTIVITY_TEXT}
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block min-w-0 text-[13px] font-semibold">
            시작일 <span className="text-xs font-medium text-muted">(선택)</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block min-w-0 text-[13px] font-semibold">
            종료일 <span className="text-xs font-medium text-muted">(선택)</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        {periodError && (
          <p role="alert" className="text-xs font-semibold text-review">
            종료일이 시작일보다 빨라요.
          </p>
        )}

        <Button type="submit" disabled={!canSave} className="w-full">
          저장
        </Button>
      </form>
    </BottomSheet>
  );
}

// 카드를 누르면 나오는 창: 자세히 보기, 단계 바꾸기, 수정, 삭제.
export function ActivityDetailSheet({
  activity,
  onClose,
  onEdit,
  onStageChange,
}: {
  activity: Activity;
  onClose: () => void;
  onEdit: () => void;
  onStageChange: (stage: ActivityStage) => void;
}) {
  const [askReceipt, setAskReceipt] = useState(false);
  const stage = stageOf(activity);
  const period = formatPeriod(activity);
  const details = [
    ["기관", activity.org],
    ["종류", activity.kind],
    ["역할", activity.role],
    ["기간", period],
    ["다음 마감", formatKoreanDate(activity.date)],
  ].filter(([, value]) => value);

  return (
    <BottomSheet open onClose={onClose} title={activity.title}>
      <dl className="space-y-1.5 text-[13px]">
        {details.map(([label, value]) => (
          <div key={label} className="flex gap-3">
            <dt className="w-16 shrink-0 text-muted">{label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>

      <h3 className="mt-4 text-[13px] font-semibold">단계 바꾸기</h3>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {ACTIVITY_STAGES.map((value) => (
          <Chip
            key={value}
            active={stage === value}
            onClick={() => {
              if (value === stage) return;
              setActivityStage(activity.id, value);
              setAskReceipt(value === "done");
              onStageChange(value);
            }}
          >
            {STAGE_LABEL[value]}
          </Chip>
        ))}
      </div>

      {askReceipt && (
        <div role="status" className="mt-3 rounded-callout bg-brand-soft p-3.5">
          <p className="text-[13px] font-bold">스펙 영수증 쓸까요?</p>
          <p className="mt-0.5 text-xs text-muted">끝난 활동은 잊기 전에 정리해 두면 좋아요.</p>
          <Link
            href={`/career/receipts/new?activity=${encodeURIComponent(activity.id)}`}
            className="mt-2.5 flex min-h-11 w-full items-center justify-center rounded-button bg-brand px-4 text-[15px] font-semibold text-white active:bg-brand-strong"
          >
            영수증 쓰기
          </Link>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={onEdit} className="flex-1">
          고치기
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (!confirm(`'${activity.title}'을(를) 지울까요? 홈 일정에서도 사라져요.`)) return;
            removeActivity(activity.id);
            onClose();
          }}
          className="flex-1"
        >
          지우기
        </Button>
      </div>
    </BottomSheet>
  );
}
