"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import { SPEC_KINDS, type SpecKind } from "@/lib/competencies";
import {
  MAX_COMPETENCIES,
  MAX_ONE_LINER,
  MAX_RECEIPT_PERIOD,
  MAX_RECEIPT_TITLE,
  isSimpleStar,
  specKindOf,
  type ReceiptStar,
  type SpecDetail,
} from "@/lib/receipt";
import CompetencyPicker, { useJobGroups } from "./competency-picker";
import { receiptInputClass } from "./input-class";
import SpecFields, { cleanDetail } from "./spec-fields";

export { receiptInputClass };

export type ReceiptFields = ReceiptStar & {
  title: string;
  period?: string;
  kind?: SpecKind;
  detail?: SpecDetail;
};

const STAR_FIELDS = [
  { key: "situation", label: "상황" },
  { key: "task", label: "과제" },
  { key: "action", label: "행동" },
  { key: "result", label: "결과" },
] as const;

// AI가 정리한 내용을 저장 전에 확인·수정하는 칸. 저장한 영수증을 고칠 때도 쓴다.
// 간단 기록(STAR 칸이 빈 영수증)은 STAR 칸 없이 이름·구분 칸·한 줄 메모·역량만 고친다.
export default function ReceiptEditor({
  initial,
  onSave,
}: {
  initial: ReceiptFields;
  onSave: (fields: ReceiptFields) => void;
}) {
  const [fields, setFields] = useState(initial);
  const [simple] = useState(() => isSimpleStar(initial));
  const jobGroups = useJobGroups();
  const { title, period, oneLiner, competencies, kind } = fields;
  const spec = specKindOf(kind);

  const oneLinerTooLong = oneLiner.length > MAX_ONE_LINER;
  const canSave =
    title.trim() !== "" &&
    (simple || (STAR_FIELDS.every(({ key }) => fields[key].trim() !== "") && oneLiner.trim() !== "")) &&
    !oneLinerTooLong &&
    competencies.length >= 1 &&
    competencies.length <= MAX_COMPETENCIES;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSave) return;
        onSave({
          ...fields,
          title: title.trim(),
          period: period?.trim() || undefined,
          oneLiner: oneLiner.trim(),
          detail: cleanDetail(fields.detail ?? {}),
        });
      }}
      className="space-y-3.5"
    >
      <label className="block text-[13px] font-semibold">
        기록 구분
        <select
          value={kind ?? ""}
          onChange={(e) => setFields({ ...fields, kind: (e.target.value || undefined) as SpecKind | undefined })}
          className={receiptInputClass}
        >
          <option value="">고르지 않음</option>
          {SPEC_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[13px] font-semibold">
        {spec?.title ?? "활동 이름"}
        <input
          value={title}
          maxLength={MAX_RECEIPT_TITLE}
          onChange={(e) => setFields({ ...fields, title: e.target.value })}
          className={receiptInputClass}
        />
      </label>
      {spec ? (
        <SpecFields
          kind={kind}
          period={period ?? ""}
          detail={fields.detail ?? {}}
          onChange={(next) => setFields({ ...fields, period: next.period, detail: next.detail })}
        />
      ) : (
        <label className="block text-[13px] font-semibold">
          기간 <span className="text-xs font-medium text-muted">(선택)</span>
          <input
            value={period ?? ""}
            maxLength={MAX_RECEIPT_PERIOD}
            onChange={(e) => setFields({ ...fields, period: e.target.value })}
            className={receiptInputClass}
          />
        </label>
      )}

      {!simple &&
        STAR_FIELDS.map(({ key, label }) => (
          <label key={key} className="block text-[13px] font-semibold">
            {label}
            <textarea
              rows={3}
              value={fields[key]}
              onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
              className={receiptInputClass}
            />
          </label>
        ))}

      <label className="block text-[13px] font-semibold">
        {simple ? (
          <>
            한 줄 메모 <span className="text-xs font-medium text-muted">(선택)</span>
          </>
        ) : (
          "자소서 한 줄"
        )}
        <textarea
          rows={2}
          value={oneLiner}
          onChange={(e) => setFields({ ...fields, oneLiner: e.target.value })}
          className={receiptInputClass}
        />
        <span
          className={`mt-1 block text-right font-mono text-xs font-medium ${
            oneLinerTooLong ? "text-review" : "text-muted"
          }`}
        >
          {oneLiner.length}/{MAX_ONE_LINER}
        </span>
      </label>

      <CompetencyPicker
        legend="어필할 역량"
        value={competencies}
        onChange={(next) => setFields({ ...fields, competencies: next })}
        max={MAX_COMPETENCIES}
        suggest={spec?.suggest}
        extraGroups={jobGroups}
      />

      {oneLinerTooLong && (
        <p role="alert" className="text-xs font-semibold text-review">
          한 줄은 {MAX_ONE_LINER}자 이내로 줄여 주세요.
        </p>
      )}
      <Button type="submit" disabled={!canSave} className="w-full">
        저장
      </Button>
    </form>
  );
}
