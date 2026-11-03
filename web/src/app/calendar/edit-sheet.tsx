"use client";

import { useState } from "react";
import Badge from "@/components/ui/badge";
import BottomSheet from "@/components/ui/bottom-sheet";
import Button from "@/components/ui/button";
import { dateCandidates } from "@/lib/date-candidates";
import { DEADLINE_KINDS, type DeadlineKind } from "@/lib/syllabus";
import { useTimetable } from "@/lib/timetable-store";
import { shortDate, type Draft } from "./review-list";

const INPUT = "min-h-11 w-full rounded-button border border-line bg-surface px-3 text-[16px] text-ink";

// 찾은 일정 하나를 고치는 창. 날짜가 없는 '확인 필요' 일정은 원문으로 날짜 후보 3개를 보여 준다.
export default function EditSheet({
  draft,
  sourceLabel = "계획서 원문",
  onSave,
  onRemove,
  onClose,
}: {
  draft: Draft | null;
  sourceLabel?: string;
  onSave: (patch: Pick<Draft, "title" | "kind" | "date">) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={draft !== null} onClose={onClose} title={draft?.date ? "일정 고치기" : "날짜 고르기"}>
      {/* key로 일정이 바뀔 때마다 입력칸을 새로 채운다 */}
      {draft && <EditForm key={draft.key} draft={draft} sourceLabel={sourceLabel} onSave={onSave} onRemove={onRemove} />}
    </BottomSheet>
  );
}

function EditForm({
  draft,
  sourceLabel,
  onSave,
  onRemove,
}: {
  draft: Draft;
  sourceLabel: string;
  onSave: (patch: Pick<Draft, "title" | "kind" | "date">) => void;
  onRemove: () => void;
}) {
  const timetable = useTimetable();
  const [title, setTitle] = useState(draft.title);
  const [kind, setKind] = useState<DeadlineKind>(draft.kind);
  const [date, setDate] = useState(draft.date ?? "");

  const candidates = dateCandidates(`${draft.when} ${draft.title}`, draft.course, timetable);

  return (
    <div className="space-y-3">
      {!draft.date && <Badge kind="review" />}
      <input
        aria-label="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={`${INPUT} font-semibold`}
      />
      <div className="flex gap-2">
        <select
          aria-label="종류"
          value={kind}
          onChange={(e) => setKind(e.target.value as DeadlineKind)}
          className={`${INPUT} !w-24 shrink-0`}
        >
          {DEADLINE_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <p className="min-w-0 flex-1 self-center truncate text-sm text-muted">{draft.course}</p>
      </div>
      <p className="text-sm text-muted">
        {sourceLabel}: <span className="text-ink">{draft.when || "없음"}</span>
      </p>

      {candidates.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {candidates.map((c) => (
            <button
              key={c.date}
              type="button"
              aria-pressed={date === c.date}
              onClick={() => setDate(c.date)}
              className={`flex min-h-14 flex-col items-center justify-center rounded-button ${
                date === c.date ? "bg-brand text-white" : "bg-canvas text-ink"
              }`}
            >
              <span className="font-mono text-[17px] font-semibold">{shortDate(c.date)}</span>
              <span className="text-[11px] opacity-80">
                {c.weekday}요일{c.hasClass && " · 수업"}
              </span>
            </button>
          ))}
        </div>
      )}

      <label className="block">
        <span className="text-xs text-muted">{candidates.length > 0 ? "직접 고르기" : "날짜"}</span>
        <input
          type="date"
          aria-label="날짜 직접 고르기"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`${INPUT} mt-1`}
        />
      </label>
      <p className="text-xs text-muted">캘린더에 넣으면 하루 전 오전 9시 알림이 같이 들어가요.</p>

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" className="flex-1" onClick={onRemove}>
          빼기
        </Button>
        <Button
          className="flex-[2]"
          disabled={!date || !title.trim()}
          onClick={() => onSave({ title: title.trim(), kind, date: date || null })}
        >
          {date ? (
            <span>
              <span className="font-mono">{shortDate(date)}</span>로 저장
            </span>
          ) : (
            "날짜를 골라 주세요"
          )}
        </Button>
      </div>
    </div>
  );
}
