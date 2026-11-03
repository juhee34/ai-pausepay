"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";
import BottomSheet from "@/components/ui/bottom-sheet";
import Button from "@/components/ui/button";
import { useSavedDeadlines } from "@/lib/deadline-store";
import {
  DEFAULT_TARGET,
  calcRequired,
  formatPoints,
  isFinalItem,
  type GradeResult,
  type GradeScores,
  type GradeStatus,
  type GradingItem,
} from "@/lib/grades";
import {
  addGradesCourse,
  removeGradesCourse,
  setGradesScore,
  setGradesTarget,
  useGrades,
} from "@/lib/grades-store";
import {
  removeCourseGrading,
  setCourseGrading,
  useGrading,
} from "@/lib/grading-store";
import { useTimetable } from "@/lib/timetable-store";

const TARGET_CHIPS = [
  { label: "A+", value: 95 },
  { label: "A0", value: 90 },
  { label: "B+", value: 85 },
  { label: "B0", value: 80 },
];

const MAX_COURSE_LENGTH = 50;
const MAX_ITEM_NAME_LENGTH = 20;

// 내 과목이 하나도 없을 때 보여 주는 시안의 예시. 저장하지 않는다.
const EXAMPLE_ITEMS: GradingItem[] = [
  { name: "중간", weight: 30 },
  { name: "과제", weight: 20 },
  { name: "퀴즈", weight: 10 },
  { name: "출석", weight: 10 },
  { name: "기말", weight: 30 },
];
const EXAMPLE_SCORES: Record<string, GradeScores> = {
  경영통계: { 중간: 24, 과제: 18, 퀴즈: 8, 출석: 10 },
  마케팅원론: { 중간: 26, 과제: 18, 퀴즈: 10, 출석: 10 },
  회계원리: { 중간: 18, 과제: 12, 퀴즈: 6, 출석: 10 },
};

const STATUS_CLASS: Record<GradeStatus, string> = {
  여유: "bg-quiz-soft text-quiz",
  주의: "border border-review-line bg-review-soft text-review",
  위험: "bg-brand-soft text-brand",
  불가: "bg-ink text-white",
};

// 글자가 16px보다 작으면 아이폰이 입력할 때 화면을 확대한다.
const inputClass =
  "min-h-11 w-full min-w-0 rounded-button border border-line bg-surface px-3 text-[16px] outline-none focus:border-brand";

const emptySubscribe = () => () => {};

function ownValue<T>(record: Record<string, T>, key: string) {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

function StatusBadge({ status }: { status: GradeStatus }) {
  return (
    <span
      className={`inline-flex h-[22px] shrink-0 items-center rounded-full px-2 text-[11px] font-bold ${STATUS_CLASS[status]}`}
    >
      {status}
    </span>
  );
}

function ResultBlock({
  course,
  target,
  result,
}: {
  course: string;
  target: number;
  result: GradeResult;
}) {
  const { required, requiredPoints, finalWeight, missing, reached, status } = result;

  let detail = "받은 점수를 입력하면 계산해요.";
  if (finalWeight <= 0) detail = "기말 배점을 넣으면 계산해요.";
  else if (reached) detail = "기말 없이도 목표를 넘겼어요.";
  else if (status === "불가") {
    detail = `기말 배점 ${formatPoints(finalWeight)}점으로는 ${formatPoints(requiredPoints)}점을 채울 수 없어요.`;
  } else if (required !== null) {
    detail = `기말 배점 ${formatPoints(finalWeight)}점 중 ${formatPoints(requiredPoints)}점이 필요해요.`;
  }

  return (
    <div className="mt-3 rounded-block bg-brand p-4 text-white">
      <p className="text-xs font-semibold text-white/80">
        {course} · 목표 {target}점이면, 기말에서 최소
      </p>
      <p className="mt-2 font-mono text-[40px] font-bold leading-none">
        {required === null ? "—" : required.toFixed(1)}
        {required !== null && <span className="ml-1.5 text-[15px]">점</span>}
      </p>
      <p className="mt-3 text-[13px]">{detail}</p>
      {required !== null && missing > 0 && (
        <p className="mt-1 text-xs text-white/80">
          아직 입력하지 않은 항목 {missing}개는 빼고 계산했어요.
        </p>
      )}
      {status && (
        <span className="mt-3 inline-flex h-[22px] items-center rounded-full bg-white px-2.5 text-[11px] font-bold text-brand">
          {status === "불가" ? "불가" : `${status} 구간`}
        </span>
      )}
    </div>
  );
}

function PositionBar({ required }: { required: number }) {
  const position = Math.min(required, 100);
  // 말풍선이 블록 밖으로 나가지 않게 양 끝에서는 안쪽에 둔다.
  const bubble = Math.min(Math.max(position, 8), 92);

  return (
    <Block className="mt-3">
      <h2 className="text-[13px] font-bold">기말 100점 만점 기준, 필요한 점수의 위치</h2>
      <div className="relative mt-3 pt-8">
        <span
          className="absolute top-0 -translate-x-1/2 rounded-md bg-ink px-2 py-1 font-mono text-xs font-semibold text-white"
          style={{ left: `${bubble}%` }}
        >
          {required.toFixed(1)}
        </span>
        <div className="flex h-7 overflow-hidden rounded-md text-[11px] font-semibold">
          <span className="flex w-[70%] items-center justify-center bg-quiz-soft text-quiz">여유</span>
          <span className="flex w-[15%] items-center justify-center bg-review-soft text-review">주의</span>
          <span className="flex w-[15%] items-center justify-center bg-brand-soft text-brand">위험</span>
        </div>
        <span
          aria-hidden="true"
          className="absolute bottom-[-3px] top-6 w-0.5 -translate-x-1/2 bg-ink"
          style={{ left: `${position}%` }}
        />
      </div>
      <div className="relative mt-1.5 h-4 font-mono text-[11px] text-muted">
        <span className="absolute left-0">0</span>
        <span className="absolute left-[70%] -translate-x-1/2">70</span>
        <span className="absolute left-[85%] -translate-x-1/2">85</span>
        <span className="absolute right-0">100</span>
      </div>
    </Block>
  );
}

function AddCourseSheet({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (course: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <BottomSheet open onClose={onClose} title="과목 추가">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onAdd(name.trim());
        }}
      >
        <label className="block text-[13px] font-semibold" htmlFor="grades-course">
          과목 이름
        </label>
        <input
          id="grades-course"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_COURSE_LENGTH}
          placeholder="예: 재무관리"
          className={`${inputClass} mt-1.5`}
        />
        <Button type="submit" disabled={!name.trim()} className="mt-3 w-full">
          추가하기
        </Button>
      </form>
    </BottomSheet>
  );
}

function ScoreSheet({
  item,
  saved,
  onClose,
  onSave,
}: {
  item: GradingItem;
  saved: number | null;
  onClose: () => void;
  onSave: (score: number | null) => void;
}) {
  const [value, setValue] = useState(saved === null ? "" : String(saved));
  const score = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(score) && score >= 0 && score <= item.weight;

  return (
    <BottomSheet open onClose={onClose} title={`${item.name} 받은 점수`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(score);
        }}
      >
        <label className="block text-[13px] font-semibold" htmlFor="grades-score">
          배점 {formatPoints(item.weight)}점 중 몇 점을 받았나요?
        </label>
        <input
          id="grades-score"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`0 ~ ${formatPoints(item.weight)}`}
          className={`${inputClass} mt-1.5 font-mono`}
        />
        {value.trim() !== "" && !valid && (
          <p role="alert" className="mt-1.5 text-xs font-semibold text-review">
            0부터 {formatPoints(item.weight)} 사이의 숫자로 넣어 주세요.
          </p>
        )}
        <Button type="submit" disabled={!valid} className="mt-3 w-full">
          저장
        </Button>
        {saved !== null && (
          <Button variant="ghost" onClick={() => onSave(null)} className="mt-1 w-full">
            점수 지우기
          </Button>
        )}
      </form>
    </BottomSheet>
  );
}

type DraftItem = { id: number; name: string; weight: string };

function ItemsSheet({
  course,
  items,
  canRemove,
  onClose,
  onSave,
  onRemove,
}: {
  course: string;
  items: GradingItem[];
  canRemove: boolean;
  onClose: () => void;
  onSave: (items: GradingItem[]) => void;
  onRemove: () => void;
}) {
  // 처음 넣을 때는 흔한 항목 이름만 깔아 둔다. 배점은 지어내지 않고 비워 둔다.
  const [drafts, setDrafts] = useState<DraftItem[]>(() =>
    (items.length > 0
      ? items.map(({ name, weight }) => ({ name, weight: String(weight) }))
      : ["중간", "기말", "과제", "퀴즈", "출석"].map((name) => ({ name, weight: "" }))
    ).map((draft, id) => ({ ...draft, id })),
  );
  const [nextId, setNextId] = useState(drafts.length);
  const [error, setError] = useState<string | null>(null);

  const filled = drafts.filter((draft) => draft.weight.trim() !== "");
  const total = filled.reduce((sum, draft) => sum + (Number(draft.weight) || 0), 0);

  function update(id: number, change: Partial<DraftItem>) {
    setDrafts(drafts.map((draft) => (draft.id === id ? { ...draft, ...change } : draft)));
    setError(null);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const next = filled.map((draft) => ({
      name: draft.name.trim(),
      weight: Number(draft.weight),
    }));
    if (next.some((item) => !item.name)) {
      setError("배점을 넣은 항목에 이름도 넣어 주세요.");
    } else if (next.some((item) => !Number.isFinite(item.weight) || item.weight <= 0 || item.weight > 100)) {
      setError("배점은 0보다 크고 100 이하인 숫자로 넣어 주세요.");
    } else if (new Set(next.map((item) => item.name)).size !== next.length) {
      setError("같은 이름의 항목이 있어요. 이름을 다르게 해 주세요.");
    } else if (!next.some((item) => isFinalItem(item.name))) {
      setError("'기말' 항목의 배점을 넣어 주세요.");
    } else {
      onSave(next);
    }
  }

  return (
    <BottomSheet open onClose={onClose} title={`${course} 평가 항목`}>
      <p className="-mt-1 text-xs leading-relaxed text-muted">
        강의계획서에 적힌 배점(%)을 넣어 주세요. 비워 둔 항목은 저장하지 않아요.
      </p>
      <form onSubmit={save} className="mt-3">
        <ul className="space-y-2">
          {drafts.map((draft) => (
            <li key={draft.id} className="flex items-center gap-2">
              <input
                aria-label="항목 이름"
                value={draft.name}
                onChange={(e) => update(draft.id, { name: e.target.value })}
                maxLength={MAX_ITEM_NAME_LENGTH}
                placeholder="항목 이름"
                className={`${inputClass} flex-1`}
              />
              <input
                aria-label={`${draft.name || "항목"} 배점`}
                inputMode="decimal"
                value={draft.weight}
                onChange={(e) => update(draft.id, { weight: e.target.value })}
                placeholder="배점"
                className={`${inputClass} !w-20 shrink-0 font-mono`}
              />
              <button
                type="button"
                aria-label={`${draft.name || "항목"} 지우기`}
                onClick={() => setDrafts(drafts.filter((d) => d.id !== draft.id))}
                className="flex h-11 w-9 shrink-0 items-center justify-center text-muted"
              >
                <X size={18} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <Button
          variant="secondary"
          onClick={() => {
            setDrafts([...drafts, { id: nextId, name: "", weight: "" }]);
            setNextId(nextId + 1);
          }}
          className="mt-2 w-full"
        >
          항목 추가
        </Button>
        <p className={`mt-3 text-xs font-semibold ${total === 100 ? "text-muted" : "text-review"}`}>
          합계 <span className="font-mono">{formatPoints(total)}</span>
          {total !== 100 && " · 합이 100이 아니에요. 계획서를 확인해 주세요."}
        </p>
        {error && (
          <p role="alert" className="mt-1.5 text-xs font-semibold text-review">
            {error}
          </p>
        )}
        <Button type="submit" className="mt-3 w-full">
          저장
        </Button>
        {canRemove && (
          <Button variant="ghost" onClick={onRemove} className="mt-1 w-full">
            이 과목의 점수 기록 지우기
          </Button>
        )}
      </form>
    </BottomSheet>
  );
}

type Sheet = { kind: "course" } | { kind: "items" } | { kind: "score"; item: GradingItem };

export default function GradesPage() {
  const deadlines = useSavedDeadlines();
  const timetable = useTimetable();
  const grades = useGrades();
  const grading = useGrading();
  // 저장된 데이터를 읽기 전에 예시 숫자가 잠깐 보이지 않게 한다.
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const [selected, setSelected] = useState<string | null>(null);
  const [exampleTargets, setExampleTargets] = useState<Record<string, number>>({});
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [riskSoon, setRiskSoon] = useState(false);

  const myCourses = [
    ...new Set(
      [
        ...[...timetable, ...deadlines].map((item) => item.course),
        ...Object.keys(grades),
        ...Object.keys(grading),
      ]
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ];
  const isExample = myCourses.length === 0;
  const courses = isExample ? Object.keys(EXAMPLE_SCORES) : myCourses;
  const course = selected && courses.includes(selected) ? selected : courses[0];

  function itemsOf(name: string) {
    return isExample ? EXAMPLE_ITEMS : (ownValue(grading, name) ?? []);
  }
  function targetOf(name: string) {
    return isExample
      ? (ownValue(exampleTargets, name) ?? DEFAULT_TARGET)
      : (ownValue(grades, name)?.target ?? DEFAULT_TARGET);
  }
  function resultOf(name: string) {
    const scores = isExample ? EXAMPLE_SCORES[name] : (ownValue(grades, name)?.scores ?? {});
    return calcRequired(itemsOf(name), scores, targetOf(name));
  }

  function changeTarget(value: number) {
    if (isExample) setExampleTargets({ ...exampleTargets, [course]: value });
    else setGradesTarget(course, value);
  }

  const items = itemsOf(course);
  const target = targetOf(course);
  const result = resultOf(course);
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

  const defenseLines = courses
    .map((name) => ({ name, result: resultOf(name) }))
    .sort((a, b) => (b.result.required ?? -1) - (a.result.required ?? -1));
  const targets = new Set(courses.map(targetOf));

  return (
    <AppShell>
      <div className="flex min-h-7 items-center justify-between">
        {/* 오늘의 한 가지 화면(/today)이 생기면 주소를 바꾼다. 지금은 홈의 추천 블록이 그 자리다. */}
        <Link
          href="/"
          className="-ml-1 flex min-h-11 items-center gap-0.5 pr-2 text-xs font-semibold text-brand"
        >
          <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
          오늘의 한 가지
        </Link>
        {hydrated && isExample && (
          <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
            예시 데이터
          </span>
        )}
      </div>

      <h1 className="mt-1 text-[22px] font-bold">최소 점수 계산</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        최소 이 점수만 넘기면 돼요. 목표를 정하면 기말 필요 점수를 거꾸로 계산해요.
      </p>

      {hydrated && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {courses.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={name === course}
                onClick={() => setSelected(name)}
                className={`min-h-10 max-w-full break-words rounded-full border px-4 text-sm font-semibold ${
                  name === course
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-surface text-ink"
                }`}
              >
                {name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSheet({ kind: "course" })}
              className="flex min-h-10 items-center gap-1 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold text-muted"
            >
              <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
              과목
            </button>
          </div>
          {isExample && (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              예시 화면이에요. &apos;과목&apos;을 눌러 내 과목을 넣으면 내 점수로 계산해요.
            </p>
          )}

          <Block className="mt-3">
            <div className="flex items-baseline justify-between">
              <label htmlFor="grades-target" className="text-xs font-bold text-brand">
                목표 총점
              </label>
              <p className="text-[22px] font-medium">
                <span className="font-mono">{target}</span>
                <span className="text-sm">점</span>
              </p>
            </div>
            <input
              id="grades-target"
              type="range"
              min={0}
              max={100}
              step={1}
              value={target}
              onChange={(e) => changeTarget(Number(e.target.value))}
              className="mt-2 h-11 w-full accent-brand"
            />
            <div className="mt-1 grid grid-cols-4 gap-2">
              {TARGET_CHIPS.map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={target === value}
                  onClick={() => changeTarget(value)}
                  className={`min-h-11 rounded-button border font-mono text-xs font-semibold ${
                    target === value
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-line bg-surface text-ink"
                  }`}
                >
                  {label} {value}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-xs text-muted">
              학점 컷은 교수님마다 달라서, 내가 정한 기준 점수예요.
            </p>
          </Block>

          <ResultBlock course={course} target={target} result={result} />
          {result.required !== null && <PositionBar required={result.required} />}

          <Block className="mt-3">
            <h2 className="text-[15px] font-bold">지금까지 확보한 점수</h2>
            {items.length === 0 ? (
              <>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  이 과목의 평가 항목과 배점을 넣으면 계산할 수 있어요.
                </p>
                <Button onClick={() => setSheet({ kind: "items" })} className="mt-3 w-full">
                  평가 항목 넣기
                </Button>
              </>
            ) : (
              <>
                <ul className="mt-1">
                  {result.rows.map((row) => {
                    const body = (
                      <>
                        <span className="flex items-baseline justify-between text-[13px]">
                          <span className="min-w-0 break-words pr-3">{row.name}</span>
                          <span className="shrink-0 font-mono font-semibold">
                            {row.score === null ? "입력" : formatPoints(row.score)} /{" "}
                            {formatPoints(row.weight)}
                          </span>
                        </span>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-divider">
                          <span
                            className="block h-full rounded-full bg-[#A89BB0]"
                            style={{ width: `${((row.score ?? 0) / row.weight) * 100}%` }}
                          />
                        </span>
                      </>
                    );
                    return (
                      <li key={row.name}>
                        {isExample ? (
                          <div className="py-2">{body}</div>
                        ) : (
                          <button
                            type="button"
                            aria-label={`${row.name} 점수 입력`}
                            onClick={() =>
                              setSheet({
                                kind: "score",
                                item: { name: row.name, weight: row.weight },
                              })
                            }
                            className="block min-h-11 w-full py-2 text-left active:bg-divider"
                          >
                            {body}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-2 border-t border-divider pt-3 text-[13px]">
                  <p className="flex justify-between font-bold">
                    기말 전까지 확보
                    <span className="font-mono">
                      {formatPoints(result.earned)} / {formatPoints(result.earnedMax)}
                    </span>
                  </p>
                  <p className="mt-1.5 flex justify-between">
                    기말 배점
                    <span className="font-mono font-semibold">
                      {formatPoints(result.finalWeight)}점
                    </span>
                  </p>
                </div>
                {totalWeight !== 100 && (
                  <p className="mt-2.5 text-xs font-semibold text-review">
                    배점 합이 {formatPoints(totalWeight)}이에요. 계획서를 확인해 주세요.
                  </p>
                )}
                {!isExample && (
                  <Button
                    variant="ghost"
                    onClick={() => setSheet({ kind: "items" })}
                    className="mt-1 w-full"
                  >
                    항목·배점 고치기
                  </Button>
                )}
              </>
            )}
          </Block>

          <div className="mt-6 flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-bold">과목별 방어선</h2>
            <p className="shrink-0 text-xs text-muted">
              {targets.size === 1 ? `목표 ${target}점 기준` : "과목별 목표 기준"}
            </p>
          </div>
          <ul className="mt-2.5 space-y-2">
            {defenseLines.map(({ name, result: line }) => {
              let note = "받은 점수를 입력해 주세요";
              if (line.finalWeight <= 0) note = "평가 항목을 넣어 주세요";
              else if (line.reached) note = "기말 없이도 목표를 넘겼어요";
              else if (line.status === "불가") note = "기말에서 만점이어도 부족해요";
              else if (line.required !== null) note = `기말에서 최소 ${line.required.toFixed(1)}점`;
              return (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(name);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-block bg-surface p-3.5 text-left active:bg-divider"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-[15px] font-bold">{name}</span>
                      <span className="mt-0.5 block text-xs text-muted">{note}</span>
                    </span>
                    {line.status && <StatusBadge status={line.status} />}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* 학기 리스크 지도(/risk)가 생기면 Link로 바꾼다. */}
          <button
            type="button"
            onClick={() => setRiskSoon(true)}
            className="mt-4 flex min-h-11 w-full items-center justify-between rounded-button border border-brand bg-surface px-4 text-sm font-semibold text-brand active:bg-brand-soft"
          >
            부담이 몰리는 주 보기
            {riskSoon ? (
              <span role="status" className="text-xs">
                곧 열려요
              </span>
            ) : (
              <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
            )}
          </button>

          <p className="mt-4 text-[11px] leading-relaxed text-muted">
            필요 점수 = (목표 총점 − 기말 전까지 확보한 점수) ÷ 기말 배점 × 100이에요. 85점 이상이면
            위험, 70점 이상이면 주의, 100점을 넘으면 불가로 표시해요. 상대평가 과목은 실제 컷에 따라
            달라질 수 있어요.{isExample && " 화면의 숫자는 모두 예시 데이터예요."} 점수는 이 기기에만
            저장돼요.
          </p>
        </>
      )}

      {sheet?.kind === "course" && (
        <AddCourseSheet
          onClose={() => setSheet(null)}
          onAdd={(name) => {
            addGradesCourse(name);
            setSelected(name);
            setSheet(null);
          }}
        />
      )}
      {sheet?.kind === "items" && (
        <ItemsSheet
          course={course}
          items={items}
          canRemove={Object.hasOwn(grades, course) || Object.hasOwn(grading, course)}
          onClose={() => setSheet(null)}
          onSave={(next) => {
            setCourseGrading(course, next);
            setSheet(null);
          }}
          onRemove={() => {
            if (!confirm(`${course}의 점수와 평가 항목을 지울까요?`)) return;
            removeGradesCourse(course);
            removeCourseGrading(course);
            setSheet(null);
          }}
        />
      )}
      {sheet?.kind === "score" && (
        <ScoreSheet
          item={sheet.item}
          saved={ownValue(ownValue(grades, course)?.scores ?? {}, sheet.item.name) ?? null}
          onClose={() => setSheet(null)}
          onSave={(score) => {
            setGradesScore(course, sheet.item.name, score);
            setSheet(null);
          }}
        />
      )}
    </AppShell>
  );
}
