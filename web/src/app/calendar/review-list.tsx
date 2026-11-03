"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import Badge from "@/components/ui/badge";
import Block from "@/components/ui/block";
import CheckRow, { Checkbox } from "@/components/ui/check-row";
import { BADGE_OF } from "@/lib/day-plan";
import type { Deadline } from "@/lib/syllabus";

export type Draft = Deadline & { key: string; checked: boolean };

export function shortDate(ymd: string) {
  return `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8))}`;
}

// 찾은 일정 체크리스트 "캘린더에 넣을 일정".
// 날짜 없는 '확인 필요'는 맨 위에 고정, 보고 있는 달은 펼쳐 두고, 다른 달은 접은 줄로.
export default function ReviewList({
  drafts,
  month,
  onChange,
  onEdit,
}: {
  drafts: Draft[];
  month: string; // 달력에서 보고 있는 달 YYYY-MM
  onChange: (drafts: Draft[]) => void;
  onEdit: (key: string) => void;
}) {
  const setChecked = (key: string, checked: boolean) =>
    onChange(drafts.map((d) => (d.key === key ? { ...d, checked } : d)));
  const allChecked = drafts.length > 0 && drafts.every((d) => d.checked);

  const review = drafts.filter((d) => !d.date);
  const dated = drafts
    .filter((d): d is Draft & { date: string } => Boolean(d.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  const before = dated.filter((d) => d.date.slice(0, 7) < month);
  const inMonth = dated.filter((d) => d.date.slice(0, 7) === month);
  const after = dated.filter((d) => d.date.slice(0, 7) > month);

  const row = (d: Draft & { date: string }) => {
    const badge = BADGE_OF[d.kind];
    return (
      <div key={d.key} id={`draft-${d.key}`} className="scroll-mt-24">
        <CheckRow
          checked={d.checked}
          onCheckedChange={(v) => setChecked(d.key, v)}
          time={shortDate(d.date)}
          title={
            <button type="button" onClick={() => onEdit(d.key)} className="w-full truncate text-left">
              {d.title}
            </button>
          }
          sub={d.course}
          right={badge ? <Badge kind={badge}>{d.kind}</Badge> : <span className="text-[11px] text-muted">{d.kind}</span>}
        />
      </div>
    );
  };

  return (
    <Block padded={false} className="mt-2.5">
      <div className="flex items-center justify-between px-3.5 pt-2">
        <h2 className="text-[15px] font-bold">캘린더에 넣을 일정</h2>
        <label className="flex items-center gap-1 text-xs font-medium text-muted">
          모두
          <Checkbox
            checked={allChecked}
            onChange={(v) => onChange(drafts.map((d) => ({ ...d, checked: v })))}
            label="모두 고르기"
          />
        </label>
      </div>

      {review.length > 0 && (
        <div className="mt-1 divide-y divide-review-line border-y border-review-line bg-review-soft">
          {review.map((d) => (
            <div key={d.key} id={`draft-${d.key}`} className="flex min-h-11 items-center gap-3 px-3.5 py-2.5">
              <Checkbox checked={d.checked} onChange={(v) => setChecked(d.key, v)} label={`${d.title} 고르기`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{d.title}</p>
                <p className="truncate text-xs text-review">원문: {d.when || "날짜 없음"}</p>
              </div>
              <button
                type="button"
                onClick={() => onEdit(d.key)}
                className="min-h-11 shrink-0 rounded-button px-2 text-[13px] font-semibold text-brand active:bg-brand-soft"
              >
                날짜 고르기
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="divide-y divide-divider">
        {before.length > 0 && <Folded items={before} render={row} />}
        {inMonth.map(row)}
        {after.length > 0 && <Folded items={after} render={row} />}
        {dated.length === 0 && review.length === 0 && (
          <p className="px-3.5 py-4 text-sm text-muted">넣을 일정이 없어요.</p>
        )}
      </div>
    </Block>
  );
}

// 다른 달 일정을 접은 줄: "9·10월 · 퀴즈·보고서·중간고사 3/3"
function Folded({
  items,
  render,
}: {
  items: (Draft & { date: string })[];
  render: (d: Draft & { date: string }) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const months = [...new Set(items.map((d) => Number(d.date.slice(5, 7))))];
  const titles = items.slice(0, 3).map((d) => d.title).join("·") + (items.length > 3 ? "…" : "");
  const checked = items.filter((d) => d.checked).length;

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center gap-2 px-3.5 py-2.5 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-sm text-muted">
          <span className="font-semibold text-ink">{months.join("·")}월</span> · {titles}
        </span>
        <span className="shrink-0 font-mono text-xs text-muted">
          {checked}/{items.length}
        </span>
        <ChevronDown
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && items.map(render)}
    </>
  );
}
