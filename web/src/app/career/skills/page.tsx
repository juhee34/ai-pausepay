"use client";

import { ChevronRight, Plus, X } from "lucide-react";
import Link from "next/link";
import BackLink from "@/components/ui/back-link";
import { useState, useSyncExternalStore } from "react";
import { getData, getServerData, subscribeData } from "@/app/focus/store";
import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";
import BottomSheet from "@/components/ui/bottom-sheet";
import { stageOf, useActivities } from "@/lib/activity-store";
import { useToday } from "@/lib/briefing";
import { COMMON_COMPETENCIES, COMPETENCY_SOURCE_NOTE, JOB_COMPETENCIES } from "@/lib/competencies";
import { useReceipts } from "@/lib/receipt-store";
import {
  FILLED_RECEIPTS,
  MAX_FIRST_TO_FILL,
  buildGapMap,
  formatFocusTime,
  jobChips,
  recommendJobs,
  type GapActivity,
  type GapCell,
  type GapFocusRecord,
  type GapReceipt,
  type GapStatus,
} from "@/lib/skill-gap";
import {
  TARGET_JOBS,
  addTargetJob,
  removeTargetJob,
  setTargetJob,
  useJobPicks,
  useSavedTargetJob,
  type TargetJob,
} from "@/lib/target-job-store";

// 내 활동과 영수증이 없을 때 보여 주는 예시. 저장하지 않는다.
const EXAMPLE_ACTIVITIES: GapActivity[] = [
  { id: "contest", title: "교내 마케팅 공모전", experience: true },
  { id: "promo", title: "학생회 홍보팀", experience: true },
  { id: "english", title: "영어회화 스터디", experience: true },
  { id: "team", title: "경영통계 팀과제", experience: true },
];
const EXAMPLE_RECEIPTS: GapReceipt[] = [
  { activityId: "contest", competencies: ["시장·소비자 분석", "마케팅 전략 기획"] },
  { activityId: "contest", competencies: ["시장·소비자 분석", "마케팅 전략 기획", "협업·리더십"] },
  { activityId: "contest", competencies: ["소통"] },
  { activityId: "promo", competencies: ["콘텐츠 기획·제작", "소통"] },
  { activityId: "promo", competencies: ["협업·리더십", "소통"] },
  { activityId: "english", competencies: ["외국어"] },
];
const EXAMPLE_RECORDS: GapFocusRecord[] = [
  { activityId: "contest", minutes: 42 * 60 },
  { activityId: "promo", minutes: 31 * 60 },
  { activityId: "english", minutes: 18 * 60 },
  { activityId: "team", minutes: 26 * 60 },
];

const BADGE_CLASS: Record<GapStatus, string> = {
  채움: "bg-brand-soft text-brand",
  "보강 필요": "bg-review-soft text-review",
  "비어 있음": "bg-divider text-muted",
};
const CELL_CLASS: Record<GapStatus, string> = {
  채움: "border border-brand",
  "보강 필요": "border border-review-line",
  "비어 있음": "border border-dashed border-[#A89BB0]",
};

function StatusBadge({ status }: { status: GapStatus }) {
  return (
    <span
      className={`inline-flex h-[22px] shrink-0 items-center rounded-full px-2 text-[11px] font-bold ${BADGE_CLASS[status]}`}
    >
      {status}
    </span>
  );
}

function SummaryBar({ cells }: { cells: GapCell[] }) {
  const order: GapStatus[] = ["채움", "보강 필요", "비어 있음"];
  const sorted = order.flatMap((status) => cells.filter((c) => c.status === status));
  return (
    <div aria-hidden="true" className="mt-3 flex gap-1">
      {sorted.map((cell) => (
        <span key={cell.name} className="h-2 flex-1 overflow-hidden rounded-full bg-divider">
          {cell.status !== "비어 있음" && (
            <span className={`block h-full bg-brand ${cell.status === "채움" ? "w-full" : "w-1/2"}`} />
          )}
        </span>
      ))}
    </div>
  );
}

function CompetencyCell({ cell }: { cell: GapCell }) {
  const dots = Math.min(cell.receipts, 3);
  return (
    <li className={`rounded-[14px] bg-surface p-3 ${CELL_CLASS[cell.status]}`}>
      <p className="text-sm font-bold break-keep">{cell.name}</p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <StatusBadge status={cell.status} />
        <span aria-hidden="true" className="flex shrink-0 gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-[7px] w-[7px] rounded-full ${i < dots ? "bg-brand" : "bg-line"}`} />
          ))}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {cell.receipts === 0 ? (
          "영수증 없음"
        ) : (
          <>
            영수증 <span className="font-mono">{cell.receipts}</span>장
            {cell.minutes > 0 && (
              <>
                {" · "}
                <span className="font-mono">{formatFocusTime(cell.minutes)}</span>
              </>
            )}
          </>
        )}
      </p>
    </li>
  );
}

function newReceiptHref(activityId?: string) {
  return activityId ? `/career/receipts/new?activity=${encodeURIComponent(activityId)}` : "/career/receipts/new";
}

export default function SkillGapPage() {
  const today = useToday();
  const activities = useActivities();
  const receipts = useReceipts();
  const focus = useSyncExternalStore(subscribeData, getData, getServerData);
  const saved = useSavedTargetJob();
  const picks = useJobPicks();
  const [adding, setAdding] = useState(false);

  const isExample = activities.length === 0 && receipts.length === 0;
  // 내 영수증이 있으면 겹치는 직무를 추천하고, 없으면 마케팅 기획을 샘플로 보여 준다.
  const recommended = isExample ? [] : (recommendJobs(JOB_COMPETENCIES, receipts, COMMON_COMPETENCIES) as TargetJob[]);
  const base = recommended.length > 0 ? recommended : [TARGET_JOBS[0]];
  const chips = jobChips(base, picks, TARGET_JOBS, saved ?? undefined) as TargetJob[];
  const job = saved && chips.includes(saved) ? saved : chips[0];
  const addable = TARGET_JOBS.filter((name) => !chips.includes(name));
  const map = isExample
    ? buildGapMap(JOB_COMPETENCIES[job], EXAMPLE_ACTIVITIES, EXAMPLE_RECEIPTS, EXAMPLE_RECORDS)
    : buildGapMap(
        JOB_COMPETENCIES[job],
        activities.map((a) => {
          const stage = stageOf(a);
          return { id: a.id, title: a.title, experience: !a.fromPosting && (stage === "active" || stage === "done") };
        }),
        receipts,
        focus.records,
      );
  const receiptCount = isExample ? EXAMPLE_RECEIPTS.length : receipts.length;
  const { 채움: filled, "보강 필요": weak, "비어 있음": empty } = map.counts;

  return (
    <AppShell>
      <div className="flex min-h-7 items-center justify-between">
        <BackLink href="/career" label="취업" />
        {today && isExample && (
          <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
            예시 데이터
          </span>
        )}
      </div>

      <h1 className="mt-1 text-[22px] font-bold">역량 공백 지도</h1>
      {today && (
        <>
          <p className="mt-1 text-[13px] text-muted">
            스펙 영수증 <span className="font-mono">{receiptCount}</span>장 · 활동{" "}
            <span className="font-mono">{map.lines.length}</span>개 기준
          </p>

          <h2 className="mt-4 text-xs font-semibold text-brand">목표 직무</h2>
          <div role="group" aria-label="목표 직무" className="mt-2 flex flex-wrap gap-2">
            {chips.map((name) => {
              const selected = name === job;
              return (
                <span
                  key={name}
                  className={`flex min-h-10 items-center rounded-full border ${
                    selected ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink"
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setTargetJob(name)}
                    className={`min-h-10 pl-3.5 text-sm font-semibold ${chips.length > 1 ? "pr-0.5" : "pr-3.5"}`}
                  >
                    {name}
                  </button>
                  {chips.length > 1 && (
                    <button
                      type="button"
                      aria-label={`${name} 목표에서 빼기`}
                      onClick={() => removeTargetJob(name)}
                      className={`flex h-10 w-9 items-center justify-center rounded-r-full ${selected ? "text-white/80" : "text-muted"}`}
                    >
                      <X size={15} strokeWidth={2} aria-hidden="true" />
                    </button>
                  )}
                </span>
              );
            })}
            {addable.length > 0 && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex min-h-10 items-center gap-1 rounded-full border border-dashed border-brand bg-surface px-3.5 text-sm font-semibold text-brand active:bg-brand-soft"
              >
                <Plus size={16} strokeWidth={2} aria-hidden="true" />
                직무 추가
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            {isExample
              ? "예시 직무예요. 스펙 영수증을 쓰면 내 기록에 맞는 직무를 추천해 드려요."
              : recommended.length > 0
                ? "내 영수증과 겹치는 직무를 골라 뒀어요. ＋로 더하고 X로 뺄 수 있어요."
                : "영수증에 역량이 쌓이면 맞는 직무를 추천해 드려요. ＋로 직접 고를 수도 있어요."}
          </p>

          <Block className="mt-3">
            <p className="text-sm font-bold">
              {job}에 필요한 역량 <span className="font-mono">{map.cells.length}</span>개 중{" "}
              <span className="font-mono text-brand">{filled}개</span>를 채웠어요.
            </p>
            <SummaryBar cells={map.cells} />
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
              <span className="flex items-center gap-1">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-brand" />채움{" "}
                <span className="font-mono">{filled}</span>
              </span>
              <span className="flex items-center gap-1">
                <span aria-hidden="true" className="h-2.5 w-2.5 overflow-hidden rounded-sm bg-divider">
                  <span className="block h-full w-1/2 bg-brand" />
                </span>
                보강 필요 <span className="font-mono">{weak}</span>
              </span>
              <span className="flex items-center gap-1">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm border border-dashed border-[#A89BB0]" />
                비어 있음 <span className="font-mono">{empty}</span>
              </span>
            </div>
          </Block>

          <div className="mt-5 flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-bold">역량별 상태</h2>
            <span className="text-[11px] text-muted">영수증 {FILLED_RECEIPTS}장 이상이면 채움</span>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-2">
            {map.cells.map((cell) => (
              <CompetencyCell key={cell.name} cell={cell} />
            ))}
          </ul>

          <div className="mt-5 flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-bold">먼저 채울 칸</h2>
            <span className="text-[11px] text-muted">비어 있는 칸부터, 최대 {MAX_FIRST_TO_FILL}개</span>
          </div>
          {map.firstToFill.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {map.firstToFill.map((fill) => (
                <li key={fill.name}>
                  <Link
                    href={newReceiptHref(isExample ? undefined : fill.activityId)}
                    className="block rounded-block bg-surface p-3.5 active:bg-divider"
                  >
                    <span className="flex items-center gap-2">
                      <StatusBadge status={fill.status} />
                      <span className="text-sm font-bold">{fill.name}</span>
                    </span>
                    <span className="mt-1.5 block text-xs leading-relaxed text-muted">{fill.hint}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Block className="mt-2">
              <p className="text-[13px] text-muted">이 직무의 역량을 모두 채웠어요. 다른 직무도 살펴보세요.</p>
            </Block>
          )}

          <div className="mt-5 flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-bold">내 활동 기록</h2>
            <span className="text-[11px] text-muted">투입 시간과 영수증</span>
          </div>
          {map.lines.length === 0 && map.loose.receipts === 0 ? (
            <Block className="mt-2">
              <p className="text-[13px] leading-relaxed text-muted">
                아직 기록할 활동이 없어요. 대외활동을 넣거나 집중 모드에서 활동으로 시간을 기록해 보세요.
              </p>
              <Link href="/career" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-brand">
                대외활동 넣기
              </Link>
            </Block>
          ) : (
            <ul className="mt-2 space-y-2">
              {map.lines.map((line) => (
                <li key={line.id} className="rounded-block bg-surface p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-bold break-keep">{line.title}</p>
                    {line.receipts === 0 && line.minutes > 0 && (
                      <span className="inline-flex h-[22px] shrink-0 items-center rounded-full bg-review-soft px-2 text-[11px] font-bold text-review">
                        기록 없는 시간
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs">
                    <span className="font-mono">{formatFocusTime(line.minutes)}</span> 투입 ·{" "}
                    {line.receipts > 0 ? (
                      <>
                        자소서 재료 <span className="font-mono">{line.receipts}</span>개
                      </>
                    ) : (
                      <>
                        영수증 <span className="font-mono">0</span>장
                      </>
                    )}
                  </p>
                  {line.competencies.length > 0 && (
                    <p className="mt-1 text-xs text-muted">{line.competencies.join(" · ")}</p>
                  )}
                  {line.receipts === 0 && (
                    <>
                      {line.minutes > 0 && (
                        <p className="mt-1 text-xs leading-relaxed text-muted">
                          집중 모드에서 이 활동으로 기록한 시간이에요. 영수증으로 남기면 비어 있는 칸을 채울 후보가 돼요.
                        </p>
                      )}
                      <Link
                        href={newReceiptHref(isExample ? undefined : line.id)}
                        className="mt-2 inline-flex min-h-11 items-center rounded-button border border-brand bg-surface px-4 text-sm font-semibold text-brand active:bg-brand-soft"
                      >
                        STAR로 기록하기
                      </Link>
                    </>
                  )}
                </li>
              ))}
              {map.loose.receipts > 0 && (
                <li className="rounded-block bg-surface p-3.5">
                  <p className="text-sm font-bold">활동에 연결하지 않은 영수증</p>
                  <p className="mt-1.5 text-xs">
                    자소서 재료 <span className="font-mono">{map.loose.receipts}</span>개
                  </p>
                  {map.loose.competencies.length > 0 && (
                    <p className="mt-1 text-xs text-muted">{map.loose.competencies.join(" · ")}</p>
                  )}
                </li>
              )}
            </ul>
          )}

          <Link
            href="/career/receipts"
            className="mt-4 flex min-h-11 w-full items-center justify-between rounded-button border border-brand bg-surface px-4 text-sm font-semibold text-brand active:bg-brand-soft"
          >
            스펙 영수증 보기
            <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
          </Link>

          <p className="mt-4 text-[11px] leading-relaxed text-muted">
            그 역량이 적힌 영수증이 {FILLED_RECEIPTS}장 이상이면 채움, 1장이면 보강 필요, 없으면 비어 있음이에요. 시간은 그 영수증이
            연결된 활동에 집중 모드로 기록한 시간의 합이고, 같은 활동은 한 번만 더해요. {COMPETENCY_SOURCE_NOTE}
            {isExample && " 화면의 숫자는 모두 예시 데이터예요."} 추천 직무는 공통 역량(문제 해결·협업·리더십·소통)을 뺀 직무 역량 중 내 영수증이 있는 칸이 많은 순으로 최대 3개예요.
          </p>
        </>
      )}

      <BottomSheet open={adding} onClose={() => setAdding(false)} title="목표 직무 추가">
        <ul className="space-y-2">
          {addable.map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => {
                  addTargetJob(name);
                  setAdding(false);
                }}
                className="w-full rounded-[14px] bg-canvas p-3 text-left active:bg-divider"
              >
                <span className="text-sm font-bold">{name}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">
                  {JOB_COMPETENCIES[name].slice(0, 5).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </AppShell>
  );
}
