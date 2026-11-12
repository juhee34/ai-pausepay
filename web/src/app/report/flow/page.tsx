"use client";

import { ChevronRight, Share } from "lucide-react";
import Link from "next/link";
import BackLink from "@/components/ui/back-link";
import { useRef, useState } from "react";
import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";
import { safeFileName } from "@/lib/save-pdf";
import { adviceFor, leadLabel, type Procrastination, type SemesterFlow } from "@/lib/semester-flow";
import { LAST_WEEK } from "@/lib/risk";
import { SEMESTER_LABEL, formatHours } from "@/lib/semester-report";
import { shareElementImage } from "@/lib/share-image";
import ShareCard from "../share-card";
import { useSemesterSnapshot } from "../use-semester";

const TICKS = new Set([1, 4, 8, 12, 16]);

function shareSentence(flow: SemesterFlow) {
  const share = flow.examShare;
  if (share && share.hours > 0) {
    if (share.weeks.length === 1) return `${share.weeks[0]}주차에 전체 시간의 ${share.percent}%가 몰렸어요.`;
    if (share.weeks.length === 2) {
      return `${share.weeks[0]}주차와 ${share.weeks[1]}주차, 두 주에 전체 시간의 ${share.percent}%가 몰렸어요.`;
    }
    return `시험이 있는 ${share.weeks.length}주에 전체 시간의 ${share.percent}%가 몰렸어요.`;
  }
  if (flow.busiest) return `가장 많이 공부한 주는 ${flow.busiest.week}주차(${formatHours(flow.busiest.hours)}시간)예요.`;
  return "아직 이번 학기 집중 기록이 없어요.";
}

function WeeklyChart({ flow }: { flow: SemesterFlow }) {
  const max = Math.max(...flow.weekly, 0);
  const exam = new Set(flow.examWeeks);
  const total = flow.weekly.reduce((sum, hours) => sum + hours, 0);
  return (
    <>
      <div className="mt-6 flex h-[132px] items-end gap-1" role="img" aria-label="주차별 집중 시간 막대">
        {flow.weekly.map((hours, index) => {
          const isExam = exam.has(index + 1);
          return (
            <div key={index} className="flex h-full flex-1 flex-col items-center justify-end">
              {isExam && hours > 0 && (
                <span className="mb-0.5 font-mono text-[10px] font-semibold text-brand">{formatHours(hours)}h</span>
              )}
              <span
                className={`w-full rounded-t-[3px] ${isExam ? "bg-brand" : hours > 0 ? "bg-[#A89BB0]" : "bg-divider"}`}
                style={{ height: max > 0 && hours > 0 ? `${Math.max(4, (hours / max) * 82)}%` : "2px" }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1 font-mono text-[11px] text-muted">
        {Array.from({ length: LAST_WEEK }, (_, index) => (
          <span key={index} className="flex-1 text-center">
            {TICKS.has(index + 1) ? index + 1 : ""}
          </span>
        ))}
      </div>
      <p className="text-right text-[11px] text-muted">주차</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-brand" />
          시험 주간
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-[#A89BB0]" />그 외 주
        </span>
        <span>합계 {formatHours(total)}시간</span>
      </div>
    </>
  );
}

function dLabel(days: number) {
  return days >= 0 ? `D-${days}` : `D+${-days}`;
}

// 0%가 왼쪽(오래 전), 100%가 마감
function Timeline({ late }: { late: Procrastination }) {
  const span = Math.max(late.noticeDays ?? 0, late.averageLead, late.leadDays, 1);
  const pos = (days: number) => ((span - Math.min(Math.max(days, 0), span)) / span) * 100;
  const label = (days: number) => Math.min(85, Math.max(15, pos(days)));
  const now = pos(late.leadDays);
  const average = pos(late.averageLead);

  return (
    <div className="relative mt-3 h-[58px]" aria-hidden="true">
      <span className="absolute top-0 whitespace-nowrap text-[11px] text-muted" style={{ left: `${label(late.averageLead)}%`, transform: "translateX(-50%)" }}>
        평균 착수 {dLabel(late.averageLead)}
      </span>
      <span className="absolute right-0 top-0 text-[11px] text-muted">마감</span>
      <span className="absolute inset-x-0 top-[25px] h-0.5 bg-line" />
      <span className="absolute top-[24px] h-1 bg-brand" style={{ left: `${now}%`, right: 0 }} />
      {late.noticeDays !== undefined && (
        <span className="absolute left-0 top-[19px] h-3.5 w-3.5 rounded-full border-2 border-muted bg-surface" />
      )}
      <span
        className="absolute top-[18px] h-4 w-4 rounded-full border-2 border-ink bg-surface"
        style={{ left: `${average}%`, transform: "translateX(-50%)" }}
      />
      <span
        className="absolute top-[19px] h-3.5 w-3.5 rounded-full bg-brand"
        style={{ left: `${now}%`, transform: "translateX(-50%)" }}
      />
      <span className="absolute right-0 top-[17px] h-[18px] w-0.5 bg-ink" />
      {late.noticeDays !== undefined && (
        <span className="absolute bottom-0 left-0 text-[11px] text-muted">시작일 D-{late.noticeDays}</span>
      )}
      <span
        className="absolute bottom-0 whitespace-nowrap text-[11px] font-bold text-brand"
        style={{ left: `${label(late.leadDays)}%`, transform: "translateX(-50%)" }}
      >
        이번 {dLabel(late.leadDays)}
      </span>
    </div>
  );
}

// 시간 흐름: 주차별 집중 시간, 가장 많이 미룬 과제, 다음 학기 조언을 코드로 계산해 보여 주고 이미지로 공유한다.
export default function FlowPage() {
  const { today, isExample, report, flow, over } = useSemesterSnapshot();
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const advice = adviceFor(report, flow);
  const late = flow.procrastination;

  async function share() {
    if (!cardRef.current || sharing) return;
    setSharing(true);
    setNotice(null);
    try {
      const result = await shareElementImage(
        cardRef.current,
        safeFileName(`우니스 학기 결산 ${SEMESTER_LABEL}`, "png"),
        "우니스 학기 결산",
      );
      if (result === "downloaded") setNotice("이미지를 내려받았어요. 사진이나 파일 앱에서 찾을 수 있어요.");
    } catch {
      setNotice("이미지를 만들지 못했어요. 사파리나 크롬으로 열어 다시 해 주세요.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <AppShell>
      <div className="flex min-h-7 items-center justify-between">
        <BackLink href="/report" label="결산서 요약" />
        {today && isExample && (
          <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
            예시 데이터
          </span>
        )}
      </div>

      <h1 className="mt-1 text-[22px] font-bold">시간 흐름</h1>
      <p className="mt-1 text-[13px] text-muted">집중 모드 기록으로 본 {LAST_WEEK}주</p>

      <Block className="mt-3 p-4">
        <h2 className="text-[15px] font-bold">주차별 집중 시간</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">{shareSentence(flow)}</p>
        <WeeklyChart flow={flow} />
      </Block>

      <Block className="mt-3 p-4">
        <p className="text-xs font-bold text-brand">가장 많이 미룬 과제</p>
        {late ? (
          <>
            <h2 className="mt-1 break-words text-[15px] font-bold">
              {late.course} · {late.title}
            </h2>
            <Timeline late={late} />
            <p className="mt-3 text-[13px] leading-relaxed">
              {leadLabel(late.leadDays)}에 첫 집중 세션을 시작했어요. 이번 학기 과제 평균은 {leadLabel(late.averageLead)}
              {late.averageLead < 0 ? "였어요." : "이었어요."}
            </p>
          </>
        ) : (
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            과제 일정에서 집중 모드를 시작하면, 과제를 마감 며칠 전에 시작했는지 여기에 쌓여요.
          </p>
        )}
      </Block>

      <div className="mt-3 rounded-block bg-brand-soft p-4">
        <h2 className="text-[17px] font-bold text-brand">다음 학기에는</h2>
        {advice.length > 0 ? (
          <ul className="mt-2 space-y-2.5">
            {advice.map((item) => (
              <li key={item.strong} className="text-[13px] leading-relaxed">
                <strong>{item.strong}</strong> {item.rest}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] leading-relaxed">기록과 예상 성적이 더 쌓이면 다음 학기 조언이 생겨요.</p>
        )}
      </div>

      <button
        type="button"
        onClick={share}
        disabled={sharing}
        className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-button bg-brand text-[15px] font-semibold text-white active:bg-brand-strong disabled:opacity-60"
      >
        <Share size={18} strokeWidth={1.8} aria-hidden="true" />
        {sharing ? "이미지 만드는 중…" : "이미지로 공유하기"}
      </button>
      {notice && (
        <p role="status" className="mt-1.5 px-1 text-xs font-semibold text-muted">
          {notice}
        </p>
      )}

      <Link
        href="/career/skills"
        className="mt-2.5 flex min-h-14 w-full items-center justify-between rounded-button border border-brand bg-surface px-4 text-sm font-semibold text-brand active:bg-brand-soft"
      >
        역량 공백 지도 보기
        <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
      </Link>

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        주차별 시간은 집중 모드를 켠 시간이고, 시험 주간은 중간·기말 일정이 있는 주예요. 미루기 기록은 과제 마감일과 그 일정에서 시작한 첫 집중 세션일의
        차이예요. 조언은 정해진 규칙으로 만들고, 공유 이미지는 이 기기에서만 만들어요.
        {isExample && " 화면의 숫자는 모두 예시 데이터예요."}
      </p>

      {/* 화면 밖에 두는 공유 카드 */}
      <div aria-hidden="true" className="pointer-events-none fixed left-[-10000px] top-0">
        <div ref={cardRef}>
          <ShareCard report={report} flow={flow} over={over} isExample={isExample} />
        </div>
      </div>
    </AppShell>
  );
}
