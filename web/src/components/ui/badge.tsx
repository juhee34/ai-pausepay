import type { ReactNode } from "react";

// 일정 종류별 색 (docs/DESIGN.md '일정 종류')
const KINDS = {
  assignment: { label: "과제", className: "bg-assignment-soft text-assignment" },
  quiz: { label: "퀴즈", className: "bg-quiz-soft text-quiz" },
  exam: { label: "시험", className: "bg-exam-soft text-exam" },
  review: { label: "확인 필요", className: "border border-review-line bg-review-soft text-review" },
};

export type BadgeKind = keyof typeof KINDS;

export default function Badge({ kind, children }: { kind: BadgeKind; children?: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${KINDS[kind].className}`}
    >
      {children ?? KINDS[kind].label}
    </span>
  );
}
