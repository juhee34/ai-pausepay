"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { JOB_SKILLS, PRESET_JOBS, SKILL_GROUPS, type PresetJob } from "@/lib/competencies";
import { useCustomJobs } from "@/lib/custom-job-store";
import { isPresetJob, useTargetJob } from "@/lib/target-job-store";

// pinned 묶음(내 직무)은 맨 위에 다 보이고, 아래 자소서 역량 묶음에서는 겹치는 이름을 뺀다.
export type CompetencyGroup = { label: string; names: readonly string[]; pinned?: boolean };

// 추천 직무의 전문 역량 묶음. 목표 직무를 맨 앞에 둔다.
export function jobSkillGroups(first?: PresetJob): CompetencyGroup[] {
  const order = first ? [first, ...PRESET_JOBS.filter((job) => job !== first)] : PRESET_JOBS;
  return order.map((job) => ({ label: `${job} 전문 역량`, names: JOB_SKILLS[job] }));
}

// 영수증에서 보여 줄 직무 묶음. 내 직무를 만들었으면 내 직무 역량만, 아니면 예시 직무 4개의 전문 역량.
export function useJobGroups(): CompetencyGroup[] {
  const customJobs = useCustomJobs();
  const job = useTargetJob();
  if (customJobs.length > 0) {
    return customJobs.map((j) => ({ label: `${j.name}에 필요한 역량`, names: j.competencies, pinned: true }));
  }
  return jobSkillGroups(isPresetJob(job) ? job : undefined);
}

function Chip({
  name,
  active,
  disabled,
  onClick,
}: {
  name: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-3 text-[13px] font-semibold break-keep disabled:opacity-40 ${
        active ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink"
      }`}
    >
      {name}
    </button>
  );
}

// 역량 버튼. 추천이 있으면 추천만 먼저 보이고 '더 보기'로 자소서 역량 30개(5묶음)와 직무 전문 역량을 연다.
export default function CompetencyPicker({
  legend,
  value,
  onChange,
  max,
  min = 1,
  suggest,
  extraGroups = [],
}: {
  legend: string;
  value: string[];
  onChange: (next: string[]) => void;
  max: number;
  min?: number;
  suggest?: readonly string[];
  extraGroups?: CompetencyGroup[];
}) {
  const [open, setOpen] = useState(!suggest || suggest.length === 0);
  const full = value.length >= max;

  function toggle(name: string) {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  }

  function chip(name: string) {
    const active = value.includes(name);
    return <Chip key={name} name={name} active={active} disabled={!active && full} onClick={() => toggle(name)} />;
  }

  // 접힌 상태: 추천 + 이미 고른 역량
  const shortList = [...new Set([...(suggest ?? []), ...value])];
  // 같은 역량 버튼이 두 번 나오지 않게, 앞 묶음에서 나온 이름은 뒤 묶음에서 뺀다.
  const pinned = extraGroups.filter((g) => g.pinned);
  const shown = new Set<string>();
  const groups: CompetencyGroup[] = [...pinned, ...SKILL_GROUPS, ...extraGroups.filter((g) => !g.pinned)]
    .map((g) => {
      const names = g.names.filter((n) => !shown.has(n));
      names.forEach((n) => shown.add(n));
      return { ...g, names };
    })
    .filter((g) => g.names.length > 0);

  return (
    <fieldset>
      <legend className="flex w-full items-baseline justify-between gap-2 text-[13px] font-semibold">
        <span>{legend}</span>
        <span className="font-mono text-xs font-medium text-muted">
          {value.length}/{max}
          {min > 1 && ` · ${min}개 이상`}
        </span>
      </legend>

      {open ? (
        <div className="mt-2 space-y-3">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-bold text-muted">{group.label}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">{group.names.map(chip)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">{shortList.map(chip)}</div>
      )}

      {suggest && suggest.length > 0 && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="mt-1.5 inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-brand"
        >
          {open ? "추천만 보기" : "역량 더 보기 (자소서 역량 30개 · 직무 역량)"}
          {open ? (
            <ChevronUp size={16} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
          )}
        </button>
      )}
    </fieldset>
  );
}
