import type { ReactNode } from "react";

// 계산 화면 맨 아래의 계산식 각주. 길어서 접어 두고, 누르면 펼친다 (docs/PRD.md '계산 화면').
export default function FormulaNote({ children }: { children: ReactNode }) {
  return (
    <details className="group mt-4 rounded-callout bg-surface px-3.5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-muted [&::-webkit-details-marker]:hidden">
        계산 방법 보기
        <span aria-hidden="true" className="font-mono transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <p className="pb-3 text-[11px] leading-relaxed text-muted">{children}</p>
    </details>
  );
}
