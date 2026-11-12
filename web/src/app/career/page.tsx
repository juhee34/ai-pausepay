"use client";

import { Award, ChevronRight, Plus, Radar } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/ui/app-shell";
import BrandLabel from "@/components/ui/brand-label";
import Block from "@/components/ui/block";
import Button from "@/components/ui/button";
import SegmentedTabs from "@/components/ui/segmented-tabs";
import {
  ACTIVITY_STAGES,
  STAGE_LABEL,
  stageOf,
  useActivities,
  type Activity,
  type ActivityStage,
} from "@/lib/activity-store";
import { useToday } from "@/lib/briefing";
import { dDay } from "@/lib/day-plan";
import { ActivityDetailSheet, ActivityFormSheet, formatPeriod } from "./activity-sheets";

// 시간 순서: 지원 중 → 불합격 → 활동 중 → 종료 (ACTIVITY_STAGES 순서)
const TABS: { value: ActivityStage; label: string }[] = ACTIVITY_STAGES.map((value) => ({
  value,
  label: STAGE_LABEL[value],
}));

// 탭바의 '취업'이 이 화면을 연다. 취업 준비의 다른 화면으로 여기서 이어 간다.
const CAREER_LINKS = [
  { href: "/career/receipts", label: "스펙 영수증", Icon: Award },
  { href: "/career/skills", label: "역량 공백 지도", Icon: Radar },
];

type Sheet = { kind: "add" } | { kind: "detail"; id: string } | { kind: "edit"; id: string };

function ActivityRow({
  activity,
  today,
  onOpen,
}: {
  activity: Activity;
  today: string;
  onOpen: () => void;
}) {
  const stage = stageOf(activity);
  // 끝난 활동이나 지난 마감에는 D-day를 달지 않는다.
  const showDDay = activity.date >= today && stage !== "done" && stage !== "rejected";
  const info = [activity.org, activity.kind, activity.role].filter(Boolean).join(" · ");
  const period = formatPeriod(activity);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-11 w-full items-center gap-3 px-3.5 py-3 text-left active:bg-divider"
    >
      <span className="min-w-0 flex-1">
        <span className="block break-words text-[15px] font-medium">{activity.title}</span>
        {info && <span className="mt-0.5 block break-words text-xs text-muted">{info}</span>}
        {period && <span className="mt-0.5 block font-mono text-xs text-muted">{period}</span>}
      </span>
      {showDDay ? (
        <span className="shrink-0 font-mono text-[13px] font-semibold text-brand">
          {dDay(today, activity.date)}
        </span>
      ) : (
        <span className="shrink-0 font-mono text-xs text-muted">
          {Number(activity.date.slice(5, 7))}/{Number(activity.date.slice(8))}
        </span>
      )}
    </button>
  );
}

// 취업 탭: 스펙 영수증·역량 공백 지도로 가는 길과 대외활동 목록(지원 중 → 불합격 → 활동 중 → 종료).
// AI 없이 이 기기 브라우저에만 저장한다.
export default function CareerPage() {
  const today = useToday();
  const activities = useActivities();
  const [tab, setTab] = useState<ActivityStage>("active");
  const [sheet, setSheet] = useState<Sheet | null>(null);

  const showStage = setTab;
  const current = activities.filter((a) => stageOf(a) === tab);
  const opened = sheet && sheet.kind !== "add" ? activities.find((a) => a.id === sheet.id) : undefined;

  return (
    <AppShell>
      <BrandLabel />
      <header className="flex items-center justify-between gap-3 px-1">
        <h1 className="text-[22px] font-bold">취업</h1>
        <Button onClick={() => setSheet({ kind: "add" })} className="shrink-0 !px-3 text-sm">
          <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
          활동 추가
        </Button>
      </header>
      <p className="mt-1 px-1 text-[13px] text-muted">대외활동, 스펙 영수증, 역량 공백 지도를 한곳에서 챙겨요.</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {CAREER_LINKS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-11 items-center gap-1.5 rounded-[14px] bg-surface py-2.5 pl-3 pr-2 text-[13px] font-semibold active:bg-divider"
          >
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-brand" />
            <span className="min-w-0 flex-1">{label}</span>
            <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted" />
          </Link>
        ))}
      </div>

      {today && (
        <>
          <h2 className="mt-5 px-1 text-[15px] font-bold">대외활동</h2>
          <div className="mt-2">
            <SegmentedTabs label="활동 단계" options={TABS} value={tab} onChange={setTab} />
          </div>

          <Block padded={false} className="mt-2.5 divide-y divide-divider overflow-hidden">
            {current.map((activity) => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                today={today}
                onOpen={() => setSheet({ kind: "detail", id: activity.id })}
              />
            ))}
            {current.length === 0 && (
              <p className="px-3.5 py-4 text-sm text-muted">
                {STAGE_LABEL[tab]}인 활동이 없어요.
              </p>
            )}
          </Block>

          <p className="mt-3 px-1 text-xs leading-relaxed text-muted">
            대외활동은 이 기기에만 저장돼요. 다음 마감은 홈 달력에도 보여요.
          </p>
        </>
      )}

      {sheet?.kind === "add" && (
        <ActivityFormSheet
          // 새로 넣는 활동은 대부분 지원하는 단계라 지원 중에서 시작한다.
          defaultStage="applied"
          onClose={() => setSheet(null)}
          onSaved={(stage) => {
            showStage(stage);
            setSheet(null);
          }}
        />
      )}
      {sheet?.kind === "detail" && opened && (
        <ActivityDetailSheet
          activity={opened}
          onClose={() => setSheet(null)}
          onEdit={() => setSheet({ kind: "edit", id: opened.id })}
          onStageChange={showStage}
        />
      )}
      {sheet?.kind === "edit" && opened && (
        <ActivityFormSheet
          activity={opened}
          defaultStage={stageOf(opened)}
          onClose={() => setSheet(null)}
          onSaved={(stage) => {
            showStage(stage);
            setSheet(null);
          }}
        />
      )}
    </AppShell>
  );
}
