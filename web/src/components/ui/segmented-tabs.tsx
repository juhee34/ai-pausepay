// 두세 칸 전환 (예: 목록 | 달력). 고른 칸만 흰색.
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
    <div role="group" aria-label={label} className="inline-flex rounded-button bg-divider p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded-[9px] px-3.5 text-[13px] font-semibold ${
              active ? "bg-surface text-ink" : "text-muted"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
