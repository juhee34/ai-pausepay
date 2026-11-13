"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronRight, FileUp, Pencil, Plus, X } from "lucide-react";
import AppShell from "@/components/ui/app-shell";
import BackLink from "@/components/ui/back-link";
import FormulaNote from "@/components/ui/formula-note";
import Block from "@/components/ui/block";
import BottomSheet from "@/components/ui/bottom-sheet";
import Button from "@/components/ui/button";
import { useSavedDeadlines } from "@/lib/deadline-store";
import {
  DEFAULT_ESTIMATE,
  DEFAULT_GRADE,
  DEFAULT_TARGET,
  GRADE_LEVELS,
  calcRequired,
  convertScore,
  estimateCuts,
  formatPoints,
  isFinalItem,
  type GradeEstimate,
  type GradeResult,
  type GradeScores,
  type GradeStatus,
  type GradingItem,
} from "@/lib/grades";
import {
  addGradesCourse,
  removeGradesCourse,
  setGradesAverage,
  setGradesScore,
  setGradesSettings,
  setGradesSpread,
  useGrades,
  type CourseGrades,
} from "@/lib/grades-store";
import {
  removeCourseGrading,
  setCourseGrading,
  useGrading,
} from "@/lib/grading-store";
import { useTimetable } from "@/lib/timetable-store";
import ScoreUploadSheet from "./score-upload-sheet";

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
const EXAMPLE_AVERAGES: Record<string, GradeScores> = {
  경영통계: { 중간: 18 },
  마케팅원론: { 중간: 21 },
  회계원리: { 중간: 20 },
};

const STATUS_CLASS: Record<GradeStatus, string> = {
  여유: "bg-quiz-soft text-quiz",
  주의: "border border-review-line bg-review-soft text-review",
  위험: "bg-brand-soft text-brand",
  "목표 초과": "bg-ink text-white",
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
  heading,
  target,
  result,
}: {
  heading: string;
  target: number;
  result: GradeResult;
}) {
  const { required, requiredPoints, finalWeight, missing, reached, status, maxTotal } = result;
  const overTarget = status === "목표 초과";

  let detail = "받은 점수를 입력하면 계산해요.";
  if (finalWeight <= 0) detail = "기말 배점을 넣으면 계산해요.";
  else if (reached) detail = "기말 없이도 목표를 넘겼어요.";
  else if (overTarget) {
    detail = `기말을 100점 받아도 총점은 ${formatPoints(maxTotal)}점이에요. 목표 ${formatPoints(target)}점에는 ${formatPoints(target - maxTotal)}점 모자라요.`;
  } else if (required !== null) {
    detail = `기말 배점 ${formatPoints(finalWeight)}점 중 ${formatPoints(requiredPoints)}점이 필요해요.`;
  }

  return (
    <div className="mt-3 rounded-block bg-brand p-4 text-white">
      <p className="text-xs font-semibold text-white/80">
        {heading}
      </p>
      <p className="mt-2 font-mono text-[40px] font-bold leading-none">
        {required === null ? "—" : required.toFixed(1)}
        {required !== null && <span className="ml-1.5 text-[15px]">점</span>}
      </p>
      <p className="mt-3 text-[13px]">{detail}</p>
      {overTarget && (
        <p className="mt-1 text-xs leading-relaxed text-white/80">
          추정한 컷이라 실제와 다를 수 있어요.
        </p>
      )}
      {required !== null && missing > 0 && (
        <p className="mt-1 text-xs text-white/80">
          아직 입력하지 않은 항목 {missing}개는 빼고 계산했어요.
        </p>
      )}
      {status && (
        <span className="mt-3 inline-flex h-[22px] items-center rounded-full bg-white px-2.5 text-[11px] font-bold text-brand">
          {overTarget ? "목표 초과" : `${status} 구간`} · 추정
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
  savedAverage,
  onClose,
  onSave,
}: {
  item: GradingItem;
  saved: number | null;
  savedAverage: number | null;
  onClose: () => void;
  onSave: (score: number | null, average: number | null) => void;
}) {
  const [value, setValue] = useState(saved === null ? "" : String(saved));
  const [maxValue, setMaxValue] = useState(String(item.weight));
  const [averageValue, setAverageValue] = useState(savedAverage === null ? "" : String(savedAverage));
  const got = Number(value);
  const max = Number(maxValue);
  const average = Number(averageValue);
  const hasAverage = averageValue.trim() !== "";
  const maxValid = maxValue.trim() !== "" && Number.isFinite(max) && max > 0;
  const averageValid = !hasAverage || (Number.isFinite(average) && average >= 0 && average <= max);
  const valid = maxValid && averageValid && value.trim() !== "" && Number.isFinite(got) && got >= 0 && got <= max;
  const score = valid ? convertScore(got, max, item.weight) : 0;
  const convertedAverage = valid && hasAverage ? convertScore(average, max, item.weight) : null;

  return (
    <BottomSheet open onClose={onClose} title={`${item.name} 점수`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(score, convertedAverage);
        }}
      >
        <div className="grid grid-cols-3 gap-2">
          <label className="block text-[13px] font-semibold">
            내 점수
            <input
              id="grades-score"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={`${inputClass} mt-1.5 font-mono`}
            />
          </label>
          <label className="block text-[13px] font-semibold">
            평균
            <input
              id="grades-average"
              inputMode="decimal"
              value={averageValue}
              onChange={(e) => setAverageValue(e.target.value)}
              placeholder="선택"
              className={`${inputClass} mt-1.5 font-mono`}
            />
          </label>
          <label className="block text-[13px] font-semibold">
            만점
            <input
              id="grades-max"
              inputMode="decimal"
              value={maxValue}
              onChange={(e) => setMaxValue(e.target.value)}
              className={`${inputClass} mt-1.5 font-mono`}
            />
          </label>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          교수님이 알려 주신 그대로 넣어 주세요. 이 항목의 배점은 {formatPoints(item.weight)}점이에요. 평균을 넣으면 학점별 컷을 어림잡아요.
        </p>
        {valid && max !== item.weight && (
          <p role="status" className="mt-1 text-xs font-semibold text-brand">
            배점 {formatPoints(item.weight)}점 기준으로 내 점수 {formatPoints(score)}점
            {convertedAverage !== null && `, 평균 ${formatPoints(convertedAverage)}점`}이에요.
          </p>
        )}
        {valid && hasAverage && (
          <p className="mt-1 text-xs font-semibold">
            평균보다 {formatPoints(Math.abs(got - average))}점 {got >= average ? "높아요" : "낮아요"}.
          </p>
        )}
        {(value.trim() !== "" || !maxValid || hasAverage) && !valid && (value.trim() !== "" || !maxValid || !averageValid) && (
          <p role="alert" className="mt-1.5 text-xs font-semibold text-review">
            점수와 평균은 0부터 만점 사이, 만점은 0보다 큰 숫자로 넣어 주세요.
          </p>
        )}
        <Button type="submit" disabled={!valid} className="mt-3 w-full">
          저장
        </Button>
        {saved !== null && (
          <Button variant="ghost" onClick={() => onSave(null, savedAverage)} className="mt-1 w-full">
            점수 지우기
          </Button>
        )}
      </form>
    </BottomSheet>
  );
}

function EstimateSheet({
  estimate,
  measuredSpread,
  onClearMeasured,
  onClose,
  onSave,
}: {
  estimate: GradeEstimate;
  measuredSpread: number | null; // 점수표에서 구한 퍼진 정도. 있으면 이 값을 쓴다.
  onClearMeasured: () => void;
  onClose: () => void;
  onSave: (estimate: GradeEstimate) => void;
}) {
  const [spread, setSpread] = useState(String(estimate.spread));
  const [shares, setShares] = useState(() =>
    Object.fromEntries(GRADE_LEVELS.map((grade) => [grade, String(estimate.shares[grade])])),
  );
  const spreadNumber = Number(spread);
  const shareNumbers = GRADE_LEVELS.map((grade) => Number(shares[grade]));
  const valid =
    spread.trim() !== "" &&
    Number.isFinite(spreadNumber) &&
    spreadNumber > 0 &&
    spreadNumber <= 40 &&
    GRADE_LEVELS.every((grade) => shares[grade].trim() !== "") &&
    shareNumbers.every((n, i) => Number.isFinite(n) && n > 0 && n < 100 && (i === 0 || n > shareNumbers[i - 1]));

  return (
    <BottomSheet open onClose={onClose} title="추정 기준">
      <p className="-mt-1 text-xs leading-relaxed text-muted">
        꼭 고치지 않아도 계산돼요. 아래 기본값은 임시 값이라, 강의계획서나 교수님 안내에 학점 비율이 있을 때만 바꿔 주세요.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onSave({
            spread: spreadNumber,
            shares: Object.fromEntries(GRADE_LEVELS.map((grade, i) => [grade, shareNumbers[i]])) as GradeEstimate["shares"],
          });
        }}
        className="mt-3 space-y-3"
      >
        {measuredSpread !== null ? (
          <div className="rounded-button bg-canvas p-3 text-xs leading-relaxed">
            점수표에서 구한 퍼진 정도 <span className="font-mono font-semibold">{formatPoints(measuredSpread)}</span>점을 쓰고 있어요.
            <Button variant="ghost" onClick={onClearMeasured} className="mt-1 w-full">
              점수표 값 지우고 직접 넣기
            </Button>
          </div>
        ) : (
          <label className="block text-[13px] font-semibold">
            점수가 퍼진 정도 (총점 100점 기준 표준편차)
            <input
              id="grades-spread"
              inputMode="decimal"
              value={spread}
              onChange={(e) => setSpread(e.target.value)}
              className={`${inputClass} mt-1.5 font-mono`}
            />
          </label>
        )}
        <fieldset>
          <legend className="text-[13px] font-semibold">그 학점 이상이 전체의 몇 %인가요?</legend>
          <div className="mt-1.5 grid grid-cols-4 gap-2">
            {GRADE_LEVELS.map((grade) => (
              <label key={grade} className="block text-xs font-semibold">
                {grade}
                <input
                  aria-label={`${grade} 이상 비율`}
                  inputMode="decimal"
                  value={shares[grade]}
                  onChange={(e) => setShares({ ...shares, [grade]: e.target.value })}
                  className={`${inputClass} mt-1 font-mono`}
                />
              </label>
            ))}
          </div>
        </fieldset>
        {!valid && (
          <p role="alert" className="text-xs font-semibold text-review">
            퍼진 정도는 0보다 크고 40 이하, 비율은 A+부터 차례로 커지는 0~100 사이 숫자로 넣어 주세요.
          </p>
        )}
        <Button type="submit" disabled={!valid} className="w-full">
          저장
        </Button>
        <Button variant="ghost" onClick={() => onSave(DEFAULT_ESTIMATE)} className="w-full">
          기본값으로 되돌리기
        </Button>
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

type Sheet = { kind: "course" } | { kind: "items" } | { kind: "estimate" } | { kind: "upload" } | { kind: "score"; item: GradingItem };

export default function GradesPage() {
  const deadlines = useSavedDeadlines();
  const timetable = useTimetable();
  const grades = useGrades();
  const grading = useGrading();
  // 저장된 데이터를 읽기 전에 예시 숫자가 잠깐 보이지 않게 한다.
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const [selected, setSelected] = useState<string | null>(null);
  const [exampleSettings, setExampleSettings] = useState<Record<string, Partial<CourseGrades>>>({});
  const [sheet, setSheet] = useState<Sheet | null>(null);

  const myCourses = [
    ...new Set(
      [
        ...[...timetable, ...deadlines.filter((d) => !d.source)].map((item) => item.course),
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
  // 과목 하나의 입력과 계산 결과. 고른 학점의 예상 컷을 목표로 삼는다.
  function viewOf(name: string) {
    const saved: Partial<CourseGrades> = isExample
      ? (ownValue(exampleSettings, name) ?? {})
      : (ownValue(grades, name) ?? {});
    const scores = isExample ? EXAMPLE_SCORES[name] : (saved.scores ?? {});
    const averages = isExample ? EXAMPLE_AVERAGES[name] : (saved.averages ?? {});
    const items = itemsOf(name);
    const estimate = saved.estimate ?? DEFAULT_ESTIMATE;
    const grade = saved.grade ?? DEFAULT_GRADE;
    const cuts = estimateCuts(items, scores, averages, estimate, saved.spreads ?? {});
    const picked = cuts?.cuts.find((c) => c.grade === grade) ?? null;
    const savedTarget = saved.target ?? DEFAULT_TARGET;
    const target = picked ? picked.cut : savedTarget;
    return { scores, averages, estimate, grade, cuts, picked, savedTarget, target, result: calcRequired(items, scores, target) };
  }

  function changeSettings(settings: Partial<CourseGrades>) {
    if (isExample) setExampleSettings({ ...exampleSettings, [course]: { ...ownValue(exampleSettings, course), ...settings } });
    else setGradesSettings(course, settings);
  }

  const items = itemsOf(course);
  const view = viewOf(course);
  const { target, result } = view;
  const showResult = view.picked !== null;
  const roundedPick = view.picked ? Math.round(view.picked.cut) : null;
  const scoreItems = items.filter((item) => !isFinalItem(item.name));
  // 올릴 항목은 평균을 아직 넣지 않은 첫 항목을 먼저 골라 둔다.
  const firstUploadItem =
    scoreItems.find((item) => !Object.hasOwn(view.averages, item.name))?.name ?? scoreItems[0]?.name ?? "";

  // 오늘의 한 가지가 읽는 목표도 추정한 컷에 맞춰 둔다.
  useEffect(() => {
    if (!isExample && roundedPick !== null && roundedPick !== view.savedTarget) {
      setGradesSettings(course, { target: roundedPick });
    }
  }, [isExample, course, roundedPick, view.savedTarget]);

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

  const defenseLines = courses
    .map((name) => {
      const line = viewOf(name);
      // 평균이 없으면 아직 계산할 컷이 없다.
      const ready = line.picked !== null;
      return { name, line, ready, result: line.result };
    })
    .sort((a, b) => (b.ready ? (b.result.required ?? -1) : -1) - (a.ready ? (a.result.required ?? -1) : -1));

  return (
    <AppShell>
      <div className="flex min-h-7 items-center justify-between">
        {/* 학교 기능은 + 전체 기능 창에서 열리므로 홈으로 돌아간다. */}
        <BackLink href="/" label="홈" />
        {hydrated && isExample && (
          <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
            예시 데이터
          </span>
        )}
      </div>

      <h1 className="mt-1 text-[22px] font-bold">최소 점수 계산</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        시험 평균과 내 점수로 학점별 컷을 어림잡아, 기말에 몇 점이 필요한지 거꾸로 계산해요.
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

          {(isExample || items.length > 0) && (
          <Block className="mt-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[15px] font-bold">희망 학점별 기말 필요 점수</h2>
                <span className="inline-flex h-[22px] shrink-0 items-center rounded-full bg-divider px-2 text-[11px] font-bold text-muted">
                  추정
                </span>
              </div>
              {view.cuts ? (
                <>
                  <ul className="mt-2.5 space-y-1.5">
                    {view.cuts.cuts.map(({ grade, cut, result: row }) => (
                      <li key={grade}>
                        <button
                          type="button"
                          aria-pressed={grade === view.grade}
                          onClick={() => changeSettings({ grade })}
                          className={`flex min-h-11 w-full items-center gap-2 rounded-button border px-3 py-2 text-left ${
                            grade === view.grade ? "border-brand bg-brand-soft" : "border-line bg-surface"
                          }`}
                        >
                          <span className="w-8 shrink-0 font-mono text-sm font-bold">{grade}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-mono text-[15px] font-bold">
                              {row.required === null
                                ? "—"
                                : row.required > 100
                                  ? "기말 만점도 부족"
                                  : `기말 ${row.required.toFixed(1)}점`}
                            </span>
                            <span className="block font-mono text-[11px] text-muted">예상 컷 약 {formatPoints(cut)}점</span>
                          </span>
                          {row.status && <StatusBadge status={row.status} />}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2.5 text-xs leading-relaxed text-muted">
                    전체 평균을 약 <span className="font-mono">{formatPoints(view.cuts.classMean)}</span>점, 퍼진 정도를{" "}
                    <span className="font-mono">{formatPoints(view.cuts.spread)}</span>점({view.cuts.measuredSpread ? "점수표에서 구한 값" : "임시 값"})으로 봤어요. 기말 평균은 입력한 평균의 비율(
                    <span className="font-mono">{Math.round(view.cuts.averageRate * 100)}</span>%)로 봤어요.
                    {view.cuts.assumedItems.length > 0 && ` 평균을 넣지 않은 ${view.cuts.assumedItems.join(", ")}은(는) 내 점수와 같다고 봤어요.`}
                    {!view.cuts.measuredSpread && !isExample && " 전체 점수나 표준편차를 넣으면 더 정확해져요."}
                  </p>
                </>
              ) : (
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  {items.length === 0
                    ? "평가 항목을 넣고 시험 평균을 적으면 학점별 컷을 어림잡아요."
                    : "아래에서 점수표를 올리거나 항목을 눌러 평균을 넣으면 학점별 컷을 어림잡아요."}
                </p>
              )}
              {!isExample && view.cuts && (
                <button
                  type="button"
                  onClick={() => setSheet({ kind: "estimate" })}
                  className="mt-1 min-h-11 w-full text-xs font-semibold text-muted"
                >
                  학점 비율 직접 고치기 (선택)
                </button>
              )}
            </Block>
          )}

          {showResult && (
            <ResultBlock
              heading={
                `${course} · ${view.grade} 예상 컷 약 ${formatPoints(view.picked?.cut ?? target)}점이면, 기말에서 약`
              }
              target={target}
              result={result}
            />
          )}
          {showResult && result.required !== null && <PositionBar required={result.required} />}

          <Block className="mt-3">
            <h2 className="text-[15px] font-bold">지금까지 확보한 점수</h2>
            {isExample && (
              <>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  아래는 예시 점수예요. 내 과목을 넣으면 내 점수와 평균을 직접 넣을 수 있어요.
                </p>
                <Button onClick={() => setSheet({ kind: "course" })} className="mt-2.5 w-full">
                  <Plus size={16} strokeWidth={1.8} aria-hidden="true" />내 과목 넣기
                </Button>
              </>
            )}
            {!isExample && items.length > 0 && (
              <>
                <p className="mt-1 text-xs text-muted">항목을 누르면 내 점수와 평균을 넣을 수 있어요.</p>
                {scoreItems.length > 0 && (
                  <Button variant="secondary" onClick={() => setSheet({ kind: "upload" })} className="mt-2.5 w-full">
                    <FileUp size={16} strokeWidth={1.8} aria-hidden="true" />점수 사진·PDF로 넣기
                  </Button>
                )}
              </>
            )}
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
                          <span className="flex shrink-0 items-center gap-1.5">
                            {row.score === null && !isExample ? (
                              <span className="font-semibold text-brand">점수·평균 넣기</span>
                            ) : (
                              <span className="font-mono font-semibold">
                                {row.score === null ? "-" : formatPoints(row.score)} / {formatPoints(row.weight)}
                              </span>
                            )}
                            {!isExample && (
                              <Pencil size={13} strokeWidth={1.8} aria-hidden="true" className="text-muted" />
                            )}
                          </span>
                        </span>
                        {Object.hasOwn(view.averages, row.name) ? (
                          <span className="mt-0.5 block text-right font-mono text-[11px] text-muted">
                            평균 {formatPoints(view.averages[row.name])}
                          </span>
                        ) : (
                          !isExample &&
                          row.score !== null && (
                            <span className="mt-0.5 block text-right text-[11px] font-semibold text-brand">평균 넣기</span>
                          )
                        )}
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
                            aria-label={`${row.name} 점수와 평균 입력`}
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
                    배점 합이 {formatPoints(totalWeight)}이라 총점 100점 기준으로 바꿔 계산했어요. 계획서와 같은지 확인해 주세요.
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
              과목마다 고른 기준
            </p>
          </div>
          <ul className="mt-2.5 space-y-2">
            {defenseLines.map(({ name, line: settings, ready, result: line }) => {
              let note = "받은 점수를 입력해 주세요";
              if (line.finalWeight <= 0) note = "평가 항목을 넣어 주세요";
              else if (!ready) note = "시험 평균을 넣어 주세요";
              else if (line.reached) note = "기말 없이도 목표를 넘겼어요";
              else if (line.status === "목표 초과") note = `기말 만점이면 총점 ${formatPoints(line.maxTotal)}점이에요`;
              else if (line.required !== null) {
                note = `${settings.grade} 추정 컷이면 기말 약 ${line.required.toFixed(1)}점`;
              }
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
                    {ready && line.status && <StatusBadge status={line.status} />}
                  </button>
                </li>
              );
            })}
          </ul>

          <Link
            href="/risk"
            className="mt-4 flex min-h-11 w-full items-center justify-between rounded-button border border-brand bg-surface px-4 text-sm font-semibold text-brand active:bg-brand-soft"
          >
            부담이 몰리는 주 보기
            <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
          </Link>

          <FormulaNote>
            필요 점수 = (목표 총점 − 기말 전까지 확보한 점수) ÷ 기말 배점 × 100이에요. 배점 합이 100이 아니면 목표를 같은 비율로 바꿔 계산해요. 85점 이상이면
            위험, 70점 이상이면 주의, 100점을 넘으면 목표 초과로 표시해요. 예상 컷 = 전체 평균 + z × 퍼진 정도예요. 점수가 정규 분포를
            따른다고 본 추정이라 실제 컷과 다를 수 있어요. 퍼진 정도는 점수표의 표준편차를 시험과 기말 배점으로 환산한 값이고, 없으면 임시 값 10점이에요. 학점 비율도 임시 값이에요. 파일은 AI가 숫자를 읽을 때만 쓰고, 계산은 코드로 해요. 전체 점수 목록은 저장하지 않아요.{isExample && " 화면의 숫자는 모두 예시 데이터예요."} 점수는 이 기기에만 저장돼요.
          </FormulaNote>
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
          saved={ownValue(view.scores, sheet.item.name) ?? null}
          savedAverage={ownValue(view.averages, sheet.item.name) ?? null}
          onClose={() => setSheet(null)}
          onSave={(score, average) => {
            setGradesScore(course, sheet.item.name, score);
            setGradesAverage(course, sheet.item.name, average);
            setSheet(null);
          }}
        />
      )}
      {sheet?.kind === "upload" && scoreItems.length > 0 && (
        <ScoreUploadSheet
          items={scoreItems}
          firstItem={firstUploadItem}
          onClose={() => setSheet(null)}
          onApply={({ item, score, average, spread }) => {
            if (score !== null) setGradesScore(course, item, score);
            setGradesAverage(course, item, average);
            if (spread !== null) setGradesSpread(course, item, spread);
            setSheet(null);
          }}
        />
      )}
      {sheet?.kind === "estimate" && (
        <EstimateSheet
          estimate={view.estimate}
          measuredSpread={view.cuts?.measuredSpread ? view.cuts.spread : null}
          onClearMeasured={() => {
            changeSettings({ spreads: {} });
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
          onSave={(estimate) => {
            changeSettings({ estimate });
            setSheet(null);
          }}
        />
      )}
    </AppShell>
  );
}
