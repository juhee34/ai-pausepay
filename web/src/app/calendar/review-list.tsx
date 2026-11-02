"use client";

import { DEADLINE_KINDS, type Deadline, type DeadlineKind } from "@/lib/syllabus";

export type Draft = Deadline & { key: string };

type Props = {
  drafts: Draft[];
  onChange: (drafts: Draft[]) => void;
  onSave: () => void;
};

const inputClass =
  "w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm";

// AI가 찾은 일정을 사용자가 확인·수정하는 목록. 날짜가 다 채워져야 저장할 수 있다.
export default function ReviewList({ drafts, onChange, onSave }: Props) {
  const missing = drafts.filter((d) => !d.date).length;

  function update(key: string, patch: Partial<Draft>) {
    onChange(drafts.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold">찾은 일정 {drafts.length}개 · 확인하고 고쳐 주세요</h2>
      <p className="mt-1 text-xs text-foreground/50">
        AI가 찾은 결과라 틀릴 수 있어요. 원본과 날짜를 꼭 비교해 주세요.
      </p>

      <ul className="mt-4 space-y-3">
        {drafts.map((d) => (
          <li
            key={d.key}
            className={`rounded-2xl border p-4 ${
              d.date ? "border-foreground/10 bg-foreground/[0.02]" : "border-accent/50 bg-accent-soft/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <select
                aria-label="종류"
                value={d.kind}
                onChange={(e) => update(d.key, { kind: e.target.value as DeadlineKind })}
                className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent"
              >
                {DEADLINE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
              <span className="min-w-0 flex-1 truncate text-xs text-foreground/50">{d.course}</span>
              <button
                type="button"
                onClick={() => onChange(drafts.filter((x) => x.key !== d.key))}
                className="shrink-0 rounded-full px-2 py-1 text-xs text-foreground/50"
              >
                빼기
              </button>
            </div>

            <input
              aria-label="제목"
              value={d.title}
              onChange={(e) => update(d.key, { title: e.target.value })}
              className={`mt-3 font-semibold ${inputClass}`}
            />
            <input
              type="date"
              aria-label="날짜"
              value={d.date ?? ""}
              onChange={(e) => update(d.key, { date: e.target.value || null })}
              className={`mt-2 ${inputClass}`}
            />
            <p className={`mt-1.5 text-xs ${d.date ? "text-foreground/40" : "font-semibold text-accent"}`}>
              {d.date ? `원본: ${d.when}` : `원본: ${d.when} · 날짜를 넣어 주세요`}
            </p>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSave}
        disabled={missing > 0 || drafts.length === 0}
        className="mt-5 w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
      >
        {missing > 0 ? `날짜 ${missing}개를 넣으면 저장할 수 있어요` : `내 일정에 ${drafts.length}개 저장`}
      </button>
    </div>
  );
}
