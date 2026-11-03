"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";
import { useToday } from "@/lib/briefing";
import { useSavedDeadlines } from "@/lib/deadline-store";
import {
  buildRiskMap,
  topCrowdedWeek,
  type RiskDeadline,
  type RiskMap,
  type RiskPlan,
} from "@/lib/risk";

const PLANS: { value: RiskPlan; label: string }[] = [
  { value: "now", label: "지금 계획" },
  { value: "spread", label: "분산 후" },
];

// 내 일정이 없을 때 보여 주는 예시. 저장하지 않는다.
const EXAMPLE_DEADLINES: RiskDeadline[] = [
  { title: "과제 1", course: "마케팅원론", date: "2026-11-05", kind: "과제" },
  { title: "퀴즈 1", course: "조직행동론", date: "2026-11-06", kind: "퀴즈" },
  { title: "과제 1", course: "회계원리", date: "2026-11-12", kind: "과제" },
  { title: "과제 1", course: "데이터과학입문", date: "2026-11-13", kind: "과제" },
  { title: "과제 2", course: "조직행동론", date: "2026-11-19", kind: "과제" },
  { title: "퀴즈 1", course: "회계원리", date: "2026-11-20", kind: "퀴즈" },
  { title: "과제 2", course: "마케팅원론", date: "2026-11-26", kind: "과제" },
  { title: "과제 1", course: "경영통계", date: "2026-11-27", kind: "과제" },
  { title: "과제 3", course: "데이터과학입문", date: "2026-12-03", kind: "과제" },
  { title: "기말고사", course: "마케팅원론", date: "2026-12-08", kind: "기말" },
  { title: "기말고사", course: "조직행동론", date: "2026-12-09", kind: "기말" },
  { title: "기말고사", course: "회계원리", date: "2026-12-10", kind: "기말" },
  { title: "기말고사", course: "경영통계", date: "2026-12-11", kind: "기말" },
  { title: "기말고사", course: "데이터과학입문", date: "2026-12-15", kind: "기말" },
];

// 부담 표 4단계 색 (docs/DESIGN.md '칸·막대')
function cellClass(value: number) {
  if (value <= 6) return "bg-[#F8EEF1] text-ink";
  if (value <= 12) return "bg-[#E8BFCB] text-ink";
  if (value <= 18) return "bg-[#C25C7A] text-white";
  return "bg-[#8C1D40] text-white";
}

function shortDate(ymd: string) {
  return `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8))}`;
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
              {row.cells.map((value, i) => (
                <td key={map.weeks[i].week}>
                  {value === 0 ? (
                    <span className={`${CELL} bg-canvas font-normal text-muted`}>·</span>
                  ) : (
                    <span className={`${CELL} ${cellClass(value)}`}>{value}</span>
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
                <span className={`${CELL} ${week.crowded ? "bg-ink text-white" : "bg-divider text-ink"}`}>
                  {week.total}
                </span>
                {week.crowded && (
                  <span className="mt-1 block text-center text-[11px] font-bold text-brand">몰림</span>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// 학기 리스크 지도: 남은 주차에 부담이 어디로 몰리는지 코드로 계산해 보여 준다.
export default function RiskPage() {
  const today = useToday();
  const deadlines = useSavedDeadlines();
  const [plan, setPlan] = useState<RiskPlan>("now");

  const isExample = deadlines.length === 0;
  const source: RiskDeadline[] = isExample ? EXAMPLE_DEADLINES : deadlines;
  const now = today ? buildRiskMap(source, today, "now") : null;
  const spread = today ? buildRiskMap(source, today, "spread") : null;
  const map = plan === "now" ? now : spread;

  const crowdedNow = now && topCrowdedWeek(now);
  const shown = map && topCrowdedWeek(map);
  const sameWeekAfter = crowdedNow && spread?.weeks.find((w) => w.week === crowdedNow.week);

  return (
    <AppShell>
      <div className="flex min-h-7 items-center justify-between">
        <Link
          href="/grades"
          className="-ml-1 flex min-h-11 items-center gap-0.5 pr-2 text-xs font-semibold text-brand"
        >
          <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
          최소 점수 계산
        </Link>
        {today && isExample && (
          <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
            예시 데이터
          </span>
        )}
      </div>

      <h1 className="mt-1 text-[22px] font-bold">학기 리스크 지도</h1>
      {map && (
        <p className="mt-1 text-[13px] text-muted">
          {map.weeks.length > 0
            ? `남은 ${map.weeks.length}주, 어느 주에 부담이 몰리는지 미리 봐요.`
            : "이번 학기 16주가 모두 지났어요."}
        </p>
      )}

      {map && map.weeks.length > 0 && (
        <>
          <div role="group" aria-label="계획 고르기" className="mt-4 grid grid-cols-2 overflow-hidden rounded-button border border-brand">
            {PLANS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={plan === value}
                onClick={() => setPlan(value)}
                className={`min-h-11 text-sm font-semibold ${
                  plan === value ? "bg-brand text-white" : "bg-surface text-brand"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-block bg-brand-soft p-3.5">
            {shown ? (
              <>
                <p className="text-[15px] font-bold text-brand">
                  {shown.week}주차에 {plan === "now" ? `일정 ${shown.count}개가 겹쳐요` : "아직 부담이 몰려요"}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed">
                  이 주의 부담은 남은 주 평균의 {shown.ratio.toFixed(1)}배예요.
                  {plan === "now" && " 시험 준비를 시험 주에 몰아서 한다고 가정한 계획이에요."}
                </p>
              </>
            ) : (
              <>
                <p className="text-[15px] font-bold text-brand">몰린 주가 없어요</p>
                <p className="mt-1 text-[13px] leading-relaxed">
                  {plan === "now"
                    ? "남은 주의 부담이 고르게 나뉘어 있어요."
                    : "시험 준비를 나누면 부담이 평균의 1.5배를 넘는 주가 없어요."}
                </p>
              </>
            )}
          </div>

          <Block className="mt-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-bold">주차별 부담</h2>
              <span className="text-xs text-muted">시간 × 난이도</span>
            </div>
            {map.rows.length > 0 ? (
              <>
                <RiskTable map={map} />
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                  <span className="flex items-center gap-1">
                    낮음
                    <span aria-hidden="true" className="h-3 w-4 rounded-sm bg-[#F8EEF1]" />
                    <span aria-hidden="true" className="h-3 w-4 rounded-sm bg-[#E8BFCB]" />
                    <span aria-hidden="true" className="h-3 w-4 rounded-sm bg-[#C25C7A]" />
                    <span aria-hidden="true" className="h-3 w-4 rounded-sm bg-[#8C1D40]" />
                    높음
                  </span>
                  <span className="flex items-center gap-1">
                    <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-ink" />
                    몰린 주
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">남은 일정이 없어요.</p>
            )}
          </Block>

          <Block className="mt-3">
            <h2 className="text-[15px] font-bold">{plan === "now" ? "지금 계획" : "분산 후"}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              {plan === "now"
                ? "시험 준비를 시험 주에 모두 한다고 가정했어요. 분산 후를 눌러 비교해 보세요."
                : "시험 준비의 70%를 시험 전 4주에 나눠 배치했어요."}
              {plan === "spread" &&
                crowdedNow &&
                sameWeekAfter &&
                ` ${crowdedNow.week}주차 합계가 ${crowdedNow.total}에서 ${sameWeekAfter.total}로 줄어요.`}
            </p>
          </Block>
        </>
      )}

      <Link
        href="/today"
        className="mt-4 flex min-h-11 w-full items-center justify-between rounded-button border border-brand bg-surface px-4 text-sm font-semibold text-brand active:bg-brand-soft"
      >
        오늘의 한 가지로 돌아가기
        <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
      </Link>

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        부담은 예상 소요시간에 난이도(시험 3, 과제 2, 퀴즈·기타 1)를 곱해 주차별로 더한 값이에요. 예상 시간은 시험 8시간,
        과제 3시간, 퀴즈·기타 1시간으로 잡았어요. 남은 주 평균의 1.5배 이상이면 몰린 주로 표시해요. 분산 후는 시험 준비의
        70%를 시험 전 4주에 나눈 경우예요. 지난 일정, 끝낸 일정, 16주차 뒤 일정은 빼요.
        {isExample && " 화면의 숫자는 모두 예시 데이터예요."}
      </p>
    </AppShell>
  );
}
