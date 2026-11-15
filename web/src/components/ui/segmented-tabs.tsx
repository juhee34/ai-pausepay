// 두세 칸 전환 (예: 목록 | 달력). 옅은 회색 통 안에서 고른 칸만 흰색으로 떠 보인다.
export default function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-[13px] bg-fill p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded-[11px] px-3.5 text-[13px] ${
              active ? "bg-surface font-bold text-ink shadow-segment" : "font-semibold text-ink/70"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
