"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import { ALL_COMPETENCIES } from "@/lib/competencies";
import {
  MAX_COMPETENCIES,
  MAX_ONE_LINER,
  MAX_RECEIPT_PERIOD,
  MAX_RECEIPT_TITLE,
  type ReceiptStar,
} from "@/lib/receipt";

// 글자가 16px보다 작으면 아이폰이 입력할 때 화면을 확대한다.
export const receiptInputClass =
  "mt-1.5 block min-h-11 w-full min-w-0 rounded-button border border-line bg-surface px-3 py-2.5 text-[16px] font-normal text-ink outline-none placeholder:text-muted focus:border-brand";

export type ReceiptFields = ReceiptStar & { title: string; period?: string };

const STAR_FIELDS = [
  { key: "situation", label: "상황" },
  { key: "task", label: "과제" },
  { key: "action", label: "행동" },
  { key: "result", label: "결과" },
] as const;

// AI가 정리한 내용을 저장 전에 확인·수정하는 칸. 저장한 영수증을 고칠 때도 쓴다.
export default function ReceiptEditor({
  initial,
  onSave,
}: {
  initial: ReceiptFields;
  onSave: (fields: ReceiptFields) => void;
}) {
  const [fields, setFields] = useState(initial);
  const { title, period, oneLiner, competencies } = fields;

  const oneLinerTooLong = oneLiner.length > MAX_ONE_LINER;
  const canSave =
    title.trim() !== "" &&
    STAR_FIELDS.every(({ key }) => fields[key].trim() !== "") &&
    oneLiner.trim() !== "" &&
    !oneLinerTooLong &&
    competencies.length >= 1;

  function toggle(name: string) {
    setFields({
      ...fields,
      competencies: competencies.includes(name)
        ? competencies.filter((c) => c !== name)
        : [...competencies, name],
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSave) return;
        onSave({ ...fields, title: title.trim(), period: period?.trim() || undefined });
      }}
      className="space-y-3.5"
    >
      <label className="block text-[13px] font-semibold">
        활동 이름
        <input
          value={title}
          maxLength={MAX_RECEIPT_TITLE}
          onChange={(e) => setFields({ ...fields, title: e.target.value })}
          className={receiptInputClass}
        />
      </label>
      <label className="block text-[13px] font-semibold">
        기간 <span className="text-xs font-medium text-muted">(선택)</span>
        <input
          value={period ?? ""}
          maxLength={MAX_RECEIPT_PERIOD}
          onChange={(e) => setFields({ ...fields, period: e.target.value })}
          className={receiptInputClass}
        />
      </label>

      {STAR_FIELDS.map(({ key, label }) => (
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
        자소서 한 줄
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

      <fieldset>
        <legend className="text-[13px] font-semibold">
          역량 <span className="text-xs font-medium text-muted">1~{MAX_COMPETENCIES}개</span>
        </legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {ALL_COMPETENCIES.map((name) => {
            const active = competencies.includes(name);
            return (
              <button
                key={name}
                type="button"
                aria-pressed={active}
                disabled={!active && competencies.length >= MAX_COMPETENCIES}
                onClick={() => toggle(name)}
                className={`min-h-11 rounded-full border px-3 text-[13px] font-semibold disabled:opacity-40 ${
                  active ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </fieldset>

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
