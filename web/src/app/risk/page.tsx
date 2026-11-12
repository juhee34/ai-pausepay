"use client";

import { ChevronRight, Minus, Plus, Timer } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { getData, getServerData, subscribeData } from "@/app/focus/store";
import AppShell from "@/components/ui/app-shell";
import BackLink from "@/components/ui/back-link";
import FormulaNote from "@/components/ui/formula-note";
import Block from "@/components/ui/block";
import { useToday } from "@/lib/briefing";
import { useSavedDeadlines } from "@/lib/deadline-store";
import {
  SEMESTER,
  STUDY_HOUR_FIELDS,
  STUDY_HOUR_LABELS,
  buildRiskMap,
  busiestWeek,
  defaultStudyHour,
  exampleDeadlines,
  isStudyHourValue,
  kindSummary,
  spentMinutesByDeadline,
  worstWeek,
  type RiskDeadline,
  type RiskMap,
  type RiskWeekItem,
  type StudyHourField,
  type StudyHours,
} from "@/lib/risk";
import { setStudyHours, useStudyHours } from "@/lib/study-hours-store";

// 칸 색 3단계: 그 주에 마감인 할 일이 많을수록 진하다 (docs/DESIGN.md '칸·막대')
const LEVELS = [
  { max: 1, className: "bg-[#F8EEF1] text-ink", label: "1개" },
  { max: 2, className: "bg-[#E8BFCB] text-ink", label: "2개" },
  { max: Infinity, className: "bg-[#8C1D40] text-white", label: "3개 이상" },
];

function cellClass(count: number) {
  return LEVELS.find((level) => count <= level.max)?.className ?? "";
}

function shortDate(ymd: string) {
  return `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8))}`;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

// 집중 모드는 30분 단위로 시작한다
function focusHref(item: RiskWeekItem) {
  const hours = Math.max(0.5, Math.ceil(item.hours * 2) / 2);
  const params = new URLSearchParams({ course: item.course, hours: String(hours) });
  if (item.id) params.set("deadline", item.id);
  return `/focus?${params}`;
}

function itemLabel(item: RiskWeekItem) {
  return item.prep ? `${item.title} 미리 (${item.dueWeek}주차 마감)` : item.title;
}

const STEP: Record<StudyHourField, number> = { exam: 0.5, assignment: 0.5, quiz: 0.5, other: 0.5, weekly: 1 };
const SHORT_LABEL: Record<StudyHourField, string> = { exam: "시험", assignment: "과제", quiz: "퀴즈", other: "기타", weekly: "일주일" };

function studySummary(study: StudyHours) {
  const kinds = (["exam", "assignment", "quiz", "other"] as const)
    .map((field) => `${SHORT_LABEL[field]} ${study[field] ?? defaultStudyHour(field)}`)
    .join(" · ");
  return `${kinds}시간 · 일주일 ${study.weekly ?? defaultStudyHour("weekly")}시간`;
}

// 내 공부 시간: 정한 칸만 저장하고, 기본값과 같으면 저장에서 뺀다.
function StudyHoursSettings() {
  const study = useStudyHours();
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Partial<Record<StudyHourField, string>>>({});
  const custom = Object.keys(study).length > 0;

  function save(field: StudyHourField, value: number) {
    const next: StudyHours = { ...study };
    if (value === defaultStudyHour(field)) delete next[field];
    else next[field] = value;
    setStudyHours(next);
  }
  function change(field: StudyHourField, text: string) {
    setDrafts((d) => ({ ...d, [field]: text }));
    const value = Number(text.trim());
    if (text.trim() !== "" && isStudyHourValue(field, value)) save(field, value);
  }
  function step(field: StudyHourField, delta: number) {
    const now = study[field] ?? defaultStudyHour(field);
    const value = Math.round((now + delta) * 2) / 2;
    if (!isStudyHourValue(field, value)) return;
    save(field, value);
    setDrafts((d) => ({ ...d, [field]: String(value) }));
  }

  return (
    <Block className="mt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-brand">내 공부 시간 {custom ? "(내가 정함)" : "(기본값)"}</p>
          <p className="mt-0.5 font-mono text-xs text-muted">{studySummary(study)}</p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="min-h-11 shrink-0 rounded-button border border-line bg-surface px-3 text-[13px] font-semibold text-brand"
        >
          {open ? "닫기" : "고치기"}
        </button>
      </div>
      {open && (
        <div className="mt-3 border-t border-divider pt-3">
          <p className="text-xs leading-relaxed text-muted">
            사람마다 걸리는 시간이 달라요. 한 번 할 때 보통 몇 시간 걸리는지 넣어 주세요. 안 넣으면 우니스 기본값으로 예상하고, 할 일에 시간을 직접 넣었다면 그 값이 먼저예요.
          </p>
          <ul className="mt-2 space-y-2">
            {STUDY_HOUR_FIELDS.map((field) => {
              const value = study[field] ?? defaultStudyHour(field);
              const text = drafts[field] ?? String(value);
              const invalid = text.trim() === "" || !isStudyHourValue(field, Number(text.trim()));
              const id = `study-${field}`;
              return (
                <li key={field}>
                  <div className="flex items-center gap-2">
                    <label htmlFor={id} className="min-w-0 flex-1 text-sm font-semibold">
                      {STUDY_HOUR_LABELS[field]}
                    </label>
                    <button
                      type="button"
                      aria-label={`${STUDY_HOUR_LABELS[field]} 줄이기`}
                      onClick={() => step(field, -STEP[field])}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-button border border-line bg-surface text-brand"
                    >
                      <Minus size={16} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                    <input
                      id={id}
                      inputMode="decimal"
                      value={text}
                      onChange={(e) => change(field, e.target.value)}
                      aria-invalid={invalid}
                      className="min-h-11 w-16 shrink-0 rounded-button border border-line bg-surface px-2 text-center font-mono text-base text-ink outline-none focus:border-brand"
                    />
                    <button
                      type="button"
                      aria-label={`${STUDY_HOUR_LABELS[field]} 늘리기`}
                      onClick={() => step(field, STEP[field])}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-button border border-line bg-surface text-brand"
                    >
                      <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                    <span className="shrink-0 text-xs text-muted">시간</span>
                  </div>
                  {invalid && (
                    <p role="alert" className="mt-1 text-xs text-review">
                      {field === "weekly" ? "1~80" : "0.5~100"} 사이, 30분 단위로 넣어 주세요. 지금은 {value}시간으로 계산해요.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {custom && (
            <button
              type="button"
              onClick={() => {
                setStudyHours({});
                setDrafts({});
              }}
              className="mt-3 min-h-11 text-[13px] font-semibold text-brand underline-offset-2 active:underline"
            >
              기본값으로 되돌리기
            </button>
          )}
        </div>
      )}
    </Block>
  );
}

const CELL = "flex h-8 w-8 items-center justify-center rounded-md font-mono text-xs font-semibold";

function RiskTable({ map }: { map: RiskMap }) {
  return (
    <div className="-mx-3.5 mt-3 overflow-x-auto px-3.5">
      <table className="border-separate border-spacing-1">
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 bg-surface">
              <span className="sr-only">과목</span>
            </th>
            {map.weeks.map((week, i) => (
              <th
                key={week.week}
                scope="col"
                className={`w-8 pb-1 font-mono text-[11px] font-semibold ${i === 0 ? "text-brand" : "text-muted"}`}
              >
                {week.week}주
                <span className="block text-[10px] font-medium">{shortDate(week.start)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {map.rows.map((row) => (
            <tr key={row.course}>
              <th
                scope="row"
                className="sticky left-0 max-w-[68px] break-words bg-surface pr-1 text-left text-[11px] font-semibold"
              >
                {row.course}
              </th>
              {row.due.map((count, i) => (
                <td key={map.weeks[i].week}>
                  {count === 0 ? (
                    <span className={`${CELL} bg-canvas font-normal text-muted`}>·</span>
                  ) : (
                    <span aria-label={`${map.weeks[i].week}주차 ${row.course} 할 일 ${count}개`} className={`${CELL} ${cellClass(count)}`}>
                      {count}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th scope="row" className="sticky left-0 bg-surface pr-1 text-left text-[11px] font-bold">
              합계
            </th>
            {map.weeks.map((week) => (
              <td key={week.week} className="align-top">
                <span
                  aria-label={`${week.week}주차 할 일 ${week.due.length}개, 예상 ${round1(week.total)}시간${week.over > 0 ? ", 몰림" : ""}`}
                  className={`${CELL} ${week.over > 0 ? "bg-ink text-white" : "bg-divider text-ink"}`}
                >
                  {week.due.length}
                </span>
                {week.over > 0 && <span className="mt-1 block text-center text-[11px] font-bold text-brand">몰림</span>}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// 학기 리스크 지도: 남은 주마다 할 일이 얼마나 몰렸는지 보여 주고, 몰린 주는 앞으로 나눠 이번 주 할 일로 잇는다.
export default function RiskPage() {
  const today = useToday();
  const deadlines = useSavedDeadlines();
  const focus = useSyncExternalStore(subscribeData, getData, getServerData);
  const studyHours = useStudyHours();

  const isExample = deadlines.length === 0;
  const source: RiskDeadline[] = useMemo(
    () => (isExample ? (today ? exampleDeadlines(today) : []) : deadlines),
    [isExample, today, deadlines],
  );
  const spentMinutes = useMemo(() => (isExample ? {} : spentMinutesByDeadline(focus.records)), [isExample, focus.records]);
  const options = { studyHours, spentMinutes };
  const map = today ? buildRiskMap(source, today, "now", options) : null;
  const spread = today ? buildRiskMap(source, today, "spread", options) : null;
  const worst = map && worstWeek(map);
  const busiest = map && busiestWeek(map);
  const thisWeek = spread?.weeks[0];

  return (
    <AppShell>
      <div className="flex min-h-7 items-center justify-between">
        <BackLink href="/" label="홈" />
        {today && isExample && (
          <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
            예시 데이터
          </span>
        )}
      </div>

      <h1 className="mt-1 text-[22px] font-bold">학기 리스크 지도</h1>
      {map && (
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          {map.weeks.length > 0
            ? `남은 ${map.weeks.length}주 동안 할 일이 언제 몰리는지 미리 봐요.`
            : `${SEMESTER.label} ${SEMESTER.lastWeek}주가 모두 지났어요.`}
        </p>
      )}

      {map && map.weeks.length > 0 && (
        <>
          <StudyHoursSettings />

          <div className="mt-3 rounded-block bg-brand-soft p-3.5">
            {worst ? (
              <>
                <p className="text-[15px] font-bold text-brand">
                  {worst.week}주차({shortDate(worst.start)}~)에{" "}
                  {worst.due.length > 0 ? `할 일 ${worst.due.length}개가 몰려요` : "공부가 몰려요"}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed">
                  {worst.due.length > 0 && `${kindSummary(worst.due)} · `}예상 약 {round1(worst.total)}시간이라 이 주에 쓸 수 있는{" "}
                  {round1(worst.capacity)}시간을 넘어요.
                </p>
                {worst.due.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-[13px]">
                    {worst.due.slice(0, 5).map((d, i) => (
                      <li key={`${d.id ?? d.title}-${i}`} className="break-words">
                        · {d.course} {d.title}
                      </li>
                    ))}
                    {worst.due.length > 5 && <li className="text-muted">외 {worst.due.length - 5}개</li>}
                  </ul>
                )}
                <p className="mt-2 text-[13px] font-semibold leading-relaxed text-brand">
                  {spread && spread.shortage === 0
                    ? "앞 주로 미리 나누면 몰리지 않아요. 아래 '이번 주에 할 것'부터 시작해 보세요."
                    : `미리 나눠도 약 ${round1(spread?.shortage ?? 0)}시간이 모자라요. 공부 시간을 늘리거나 우선순위에서 덜 중요한 일을 줄여야 해요.`}
                </p>
              </>
            ) : busiest ? (
              <>
                <p className="text-[15px] font-bold text-brand">
                  가장 바쁜 주는 {busiest.week}주차({shortDate(busiest.start)}~), 할 일 {busiest.due.length}개예요
                </p>
                <p className="mt-1 text-[13px] leading-relaxed">
                  {kindSummary(busiest.due)} · 내 공부 시간 안에 들어와서 크게 몰리는 주는 없어요.
                </p>
              </>
            ) : (
              <p className="text-[15px] font-bold text-brand">남은 할 일이 없어요</p>
            )}
          </div>

          {thisWeek && thisWeek.items.length > 0 && (
            <>
              <h2 className="mt-5 px-1 text-[15px] font-bold">이번 주에 할 것</h2>
              <p className="mt-0.5 px-1 text-xs leading-relaxed text-muted">
                몰리지 않게 나눴을 때 이번 주 몫이에요. 누르면 그 과목으로 집중 모드를 시작해요.
              </p>
              <ul className="mt-2 space-y-2">
                {thisWeek.items.map((item) => (
                  <li key={`${item.id ?? item.title}-${item.prep}`}>
                    <Block className="flex items-center justify-between gap-3 !py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-muted">{item.course}</p>
                        <p className="break-words text-sm font-bold">{itemLabel(item)}</p>
                        <p className="font-mono text-xs text-muted">약 {round1(item.hours)}시간</p>
                      </div>
                      <Link
                        href={focusHref(item)}
                        className="flex min-h-11 shrink-0 items-center gap-1 rounded-button bg-brand px-3 text-[13px] font-semibold text-white"
                      >
                        <Timer size={16} strokeWidth={1.8} aria-hidden="true" />
                        집중 시작
                      </Link>
                    </Block>
                  </li>
                ))}
              </ul>
            </>
          )}

          <Block className="mt-3">
            <h2 className="text-[15px] font-bold">주차별 할 일</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              칸의 숫자는 그 주에 마감인 할 일 개수예요. &apos;몰림&apos;은 그 주에 해야 할 공부가 내 공부 시간을 넘는 주예요.
            </p>
            {map.rows.length > 0 ? (
              <>
                <RiskTable map={map} />
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                  {LEVELS.map((level) => (
                    <span key={level.label} className="flex items-center gap-1">
                      <span aria-hidden="true" className={`h-3 w-4 rounded-sm ${level.className}`} />
                      {level.label}
                    </span>
                  ))}
                  <span className="flex items-center gap-1">
                    <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-ink" />
                    몰린 주
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">남은 할 일이 없어요.</p>
            )}
            {(map.spent > 0 || map.excluded.postings > 0 || map.excluded.afterSemester > 0) && (
              <ul className="mt-3 space-y-1 border-t border-divider pt-2.5 text-xs leading-relaxed text-muted">
                {map.spent > 0 && <li>집중 모드로 이미 한 {round1(map.spent)}시간은 남은 공부에서 뺐어요.</li>}
                {map.excluded.postings > 0 && <li>공고·자격증 일정 {map.excluded.postings}개는 과목 공부가 아니라 표에서 뺐어요.</li>}
                {map.excluded.afterSemester > 0 && (
                  <li>
                    {SEMESTER.lastWeek}주차 뒤 일정 {map.excluded.afterSemester}개는 이 학기 표에 들어가지 않아요.
                  </li>
                )}
              </ul>
            )}
          </Block>
        </>
      )}

      <Link
        href="/today"
        className="mt-4 flex min-h-11 w-full items-center justify-between rounded-button border border-brand bg-surface px-4 text-sm font-semibold text-brand active:bg-brand-soft"
      >
        우선순위에서 오늘 할 일 보기
        <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
      </Link>

      <FormulaNote>
        표의 숫자는 그 주에 마감인 할 일 개수예요. 몰림은 그 주에 해야 할 공부 시간이 내 공부 시간(일주일에 공부할 수 있는 시간, 이번 주는
        남은 날 ÷ 7만큼)을 넘는 주예요. 공부 시간 = 예상 시간(할 일에 직접 넣은 값 &gt; 내가 정한 종류별 시간 &gt; 기본값 시험 8 · 과제 3 ·
        퀴즈·기타 1시간) − 집중 모드로 그 일정에 쓴 시간이고, 시작일을 넣은 할 일은 시작 주부터 나눠요. &apos;이번 주에 할 것&apos;은 몰린
        주의 시험·과제를 최대 4주 앞(시작일 이후)의 남는 시간으로 30분 단위로 당겨 나눈 결과이고, 시험 공부의 30%는 시험 주에 남겨요.
        {` ${SEMESTER.label}(${SEMESTER.week1Monday} 주가 1주차, ${SEMESTER.lastWeek}주차까지) 기준이고, 지난 일정·끝낸 일정·공고 일정은 빼요. 실제와 다를 수 있어요.`}
        {isExample && " 화면의 숫자는 모두 예시 데이터예요."}
      </FormulaNote>
    </AppShell>
  );
}
