"use client";

import { Plus, Trash2 } from "lucide-react";
import Block from "@/components/ui/block";
import Button from "@/components/ui/button";
import { MAX_SLOTS, MAX_TEXT_LENGTH, WEEKDAYS, type ClassSlot, type Weekday } from "@/lib/timetable";

export type SlotDraft = ClassSlot & { key: string };

const INPUT =
  "min-h-11 rounded-button border border-line bg-surface px-3 text-[15px] text-ink placeholder:text-muted/60";

// 저장 전에 고쳐야 할 점. 없으면 null.
export function slotProblem(s: SlotDraft) {
  if (!s.course.trim()) return "과목 이름을 넣어 주세요.";
  if (Boolean(s.start) !== Boolean(s.end)) return "시작과 끝 시간을 둘 다 넣거나 둘 다 비워 주세요.";
  if (s.start && s.end && s.start >= s.end) return "끝 시간이 시작 시간보다 늦어야 해요.";
  return null;
}

// AI가 읽은 시간표를 사용자가 확인·수정하는 표. 저장은 고칠 점이 없을 때만 된다.
export default function ReviewTable({
  drafts,
  replacing,
  onChange,
  onSave,
  onCancel,
}: {
  drafts: SlotDraft[];
  replacing: boolean;
  onChange: (drafts: SlotDraft[]) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const update = (key: string, patch: Partial<ClassSlot>) =>
    onChange(drafts.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const hasProblem = drafts.some((d) => slotProblem(d));

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-[15px] font-bold">찾은 수업 {drafts.length}개</h2>
        <span className="text-xs text-muted">틀린 곳을 고쳐 주세요</span>
      </div>

      <Block padded={false} className="divide-y divide-divider">
        {drafts.map((d) => {
          const problem = slotProblem(d);
          return (
            <div key={d.key} className="space-y-2 p-3.5">
              <div className="flex gap-2">
                <input
                  aria-label="과목"
                  value={d.course}
                  maxLength={MAX_TEXT_LENGTH}
                  placeholder="과목"
                  onChange={(e) => update(d.key, { course: e.target.value })}
                  className={`${INPUT} min-w-0 flex-1 font-semibold`}
                />
                <button
                  type="button"
                  aria-label={`${d.course || "이 수업"} 지우기`}
                  onClick={() => onChange(drafts.filter((x) => x.key !== d.key))}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-button text-muted active:bg-canvas"
                >
                  <Trash2 size={18} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
              {/* 시간 입력칸은 폰에서 폭을 많이 차지해서 따로 한 줄에 둔다 */}
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  aria-label="시작 시간"
                  value={d.start ?? ""}
                  onChange={(e) => update(d.key, { start: e.target.value || null })}
                  className={`${INPUT} w-0 flex-1 !px-2 text-sm`}
                />
                <span aria-hidden="true" className="text-muted">~</span>
                <input
                  type="time"
                  aria-label="끝 시간"
                  value={d.end ?? ""}
                  onChange={(e) => update(d.key, { end: e.target.value || null })}
                  className={`${INPUT} w-0 flex-1 !px-2 text-sm`}
                />
              </div>
              <div className="flex gap-2">
                <select
                  aria-label="요일"
                  value={d.day}
                  onChange={(e) => update(d.key, { day: e.target.value as Weekday })}
                  className={`${INPUT} w-16 shrink-0`}
                >
                  {WEEKDAYS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="강의실"
                  value={d.room}
                  maxLength={MAX_TEXT_LENGTH}
                  placeholder="강의실"
                  onChange={(e) => update(d.key, { room: e.target.value })}
                  className={`${INPUT} min-w-0 flex-1`}
                />
                <input
                  aria-label="교수님"
                  value={d.professor}
                  maxLength={MAX_TEXT_LENGTH}
                  placeholder="교수님"
                  onChange={(e) => update(d.key, { professor: e.target.value })}
                  className={`${INPUT} min-w-0 flex-1`}
                />
              </div>
              {problem ? (
                <p className="text-xs font-medium text-review">{problem}</p>
              ) : (
                !d.start && <p className="text-xs text-muted">시간 미정 · 홈의 다음 수업에서는 빠져요</p>
              )}
            </div>
          );
        })}
        {drafts.length < MAX_SLOTS && (
          <div className="p-2">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() =>
                onChange([
                  ...drafts,
                  { key: crypto.randomUUID(), course: "", day: "월", start: null, end: null, room: "", professor: "" },
                ])
              }
            >
              <Plus size={18} strokeWidth={1.8} aria-hidden="true" />
              수업 추가
            </Button>
          </div>
        )}
      </Block>

      {replacing && (
        <p className="mt-3 px-1 text-xs text-muted">저장하면 지금 저장된 시간표를 이걸로 바꿔요.</p>
      )}
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" className="flex-1 !bg-surface" onClick={onCancel}>
          취소
        </Button>
        <Button className="flex-[2]" disabled={drafts.length === 0 || hasProblem} onClick={onSave}>
          시간표 저장
        </Button>
      </div>
    </section>
  );
}
