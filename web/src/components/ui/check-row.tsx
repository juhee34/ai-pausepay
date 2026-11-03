import { Check } from "lucide-react";
import type { ReactNode } from "react";

// 목록 한 줄: 왼쪽 체크박스·시각(둘 다 있으면 체크박스 먼저) + 제목/보조 글 + 오른쪽 자리(배지·버튼·체크박스).
// 줄 사이 구분선은 감싸는 쪽에서 `divide-y divide-divider`로 긋는다.
export default function CheckRow({
  time,
  checked,
  onCheckedChange,
  title,
  sub,
  right,
  past = false,
}: {
  time?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  past?: boolean;
}) {
  return (
    <div className={`flex min-h-11 items-center gap-3 px-3.5 py-2.5 ${past ? "text-muted" : ""}`}>
      {checked !== undefined && (
        <Checkbox checked={checked} onChange={onCheckedChange} label={typeof title === "string" ? title : undefined} />
      )}
      {time !== undefined && (
        <span className="w-11 shrink-0 font-mono text-[13px] font-medium text-muted">{time}</span>
      )}
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] font-medium ${past ? "line-through" : ""}`}>{title}</p>
        {sub && <p className="mt-0.5 truncate text-xs text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

// 둥근 네모 체크박스. 누르는 자리는 44px.
export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange?.(!checked)}
      className="-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center"
    >
      <span
        className={`flex h-[22px] w-[22px] items-center justify-center rounded-md ${
          checked ? "bg-brand text-white" : "border-[1.5px] border-muted/40 bg-surface"
        }`}
      >
        {checked && <Check size={15} strokeWidth={2.4} aria-hidden="true" />}
      </span>
    </button>
  );
}
