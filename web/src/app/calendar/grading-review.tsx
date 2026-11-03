"use client";

import Link from "next/link";
import Badge from "@/components/ui/badge";
import Block from "@/components/ui/block";
import { useGrading } from "@/lib/grading-store";
import { reviewGrading, type GradingDraft } from "@/lib/syllabus";

export default function GradingReview({ course, drafts, onCourseChange, onChange }: {
  course: string;
  drafts: GradingDraft[];
  onCourseChange: (course: string) => void;
  onChange: (drafts: GradingDraft[]) => void;
}) {
  const { items, total, invalid, needsReview } = reviewGrading(drafts);
  return (
    <Block className="mt-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold">평가 비율</h2>
        {(items.length > 0 || invalid) && needsReview && <Badge kind="review" />}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        원본과 비교하고 고친 뒤 저장해 주세요. 빈칸은 읽지 못한 항목이에요.
      </p>
      <label className="mt-3 block text-xs font-semibold text-muted">
        평가 비율을 저장할 과목명
        <input
          value={course}
          onChange={(event) => onCourseChange(event.target.value)}
          maxLength={50}
          placeholder="예: 경영통계"
          className="mt-1 min-h-11 w-full rounded-button border border-line bg-surface px-3 text-base text-ink outline-none focus:border-brand"
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {drafts.map((item) => (
          <label key={item.name} className="flex min-h-11 items-center gap-2 text-sm">
            <span className="w-7 shrink-0">{item.name}</span>
            <input
              type="number"
              inputMode="decimal"
              aria-label={`${item.name} 평가 비율`}
              min={0}
              max={100}
              step="any"
              value={item.weight}
              onChange={(event) => onChange(drafts.map((draft) => draft.name === item.name ? { ...draft, weight: event.target.value } : draft))}
              placeholder="미확인"
              className="min-h-11 w-full min-w-0 rounded-button border border-line bg-surface px-2 text-right font-mono text-base outline-none focus:border-brand"
            />
            <span className="text-xs text-muted">%</span>
          </label>
        ))}
      </div>
      <div className="mt-3 border-t border-divider pt-3">
        <p className="text-sm font-semibold">합계 <span className="font-mono">{total}%</span></p>
        <p className={`mt-1 text-xs leading-relaxed ${needsReview && items.length > 0 ? "text-review" : "text-muted"}`}>
          {invalid ? "비율은 0~100 사이 숫자로 넣어 주세요." : items.length === 0
            ? "평가 비율이 없으면 저장하지 않아요. 원본에 적힌 값만 직접 넣어도 돼요."
            : needsReview ? "합계가 100%가 아니에요. 빠진 항목이 있는지 확인해 주세요."
            : "합계가 100%예요. 기말 필요 점수 계산에 사용할 수 있어요."}
        </p>
      </div>
    </Block>
  );
}

export function SavedGrading() {
  const grading = useGrading();
  const courses = Object.entries(grading).filter(([, items]) => items.length > 0);
  if (courses.length === 0) return null;
  return (
    <Block className="mt-6">
      <h2 className="text-[15px] font-bold">저장한 평가 비율</h2>
      <div className="mt-2 divide-y divide-divider">
        {courses.map(([course, items]) => (
          <div key={course} className="py-2">
            <p className="text-sm font-semibold break-words">{course}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {items.map((item, index) => <span key={`${item.name}-${index}`}>{index > 0 && " · "}{item.name} <span className="font-mono">{item.weight}%</span></span>)}
            </p>
          </div>
        ))}
      </div>
      <Link href="/grades" className="mt-2 flex min-h-11 items-center text-sm font-semibold text-brand">기말 필요 점수 계산·평가 비율 수정 →</Link>
    </Block>
  );
}
