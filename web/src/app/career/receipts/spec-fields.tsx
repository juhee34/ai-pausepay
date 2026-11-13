"use client";

import { MAX_SPEC_FIELD, type SpecKind } from "@/lib/competencies";
import { MAX_RECEIPT_PERIOD, specKindOf, type SpecDetail } from "@/lib/receipt";
import { receiptInputClass } from "./input-class";

// 기록 구분마다 다른 짧은 칸. key가 period인 칸은 영수증의 기간(period)에 넣는다.
export default function SpecFields({
  kind,
  period,
  detail,
  onChange,
}: {
  kind: SpecKind | undefined;
  period: string;
  detail: SpecDetail;
  onChange: (next: { period: string; detail: SpecDetail }) => void;
}) {
  const spec = specKindOf(kind);
  if (!spec) return null;
  return (
    <>
      {spec.fields.map((field) => {
        const isPeriod = field.key === "period";
        const value = isPeriod ? period : (detail[field.key] ?? "");
        return (
          <label key={field.key} className="block text-[13px] font-semibold">
            {field.label} <span className="text-xs font-medium text-muted">(선택)</span>
            <input
              value={value}
              maxLength={isPeriod ? MAX_RECEIPT_PERIOD : MAX_SPEC_FIELD}
              onChange={(e) =>
                onChange(
                  isPeriod
                    ? { period: e.target.value, detail }
                    : { period, detail: { ...detail, [field.key]: e.target.value } },
                )
              }
              placeholder={`예: ${field.placeholder}`}
              className={receiptInputClass}
            />
          </label>
        );
      })}
    </>
  );
}

// 빈 칸은 빼고 저장한다.
export function cleanDetail(detail: SpecDetail): SpecDetail | undefined {
  const entries = Object.entries(detail)
    .map(([key, value]) => [key, value.trim()] as const)
    .filter(([key, value]) => key !== "period" && value !== "");
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
