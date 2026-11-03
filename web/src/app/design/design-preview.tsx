"use client";

import { useCallback, useState, type ReactNode } from "react";
import AppShell from "@/components/ui/app-shell";
import Badge from "@/components/ui/badge";
import Block from "@/components/ui/block";
import BottomSheet from "@/components/ui/bottom-sheet";
import Button from "@/components/ui/button";
import CheckRow, { Checkbox } from "@/components/ui/check-row";
import SegmentedTabs from "@/components/ui/segmented-tabs";
import WeekStrip from "@/components/ui/week-strip";
import { addDays, useToday } from "@/lib/briefing";

const COLORS = [
  ["canvas", "bg-canvas"],
  ["surface", "bg-surface border border-line"],
  ["divider", "bg-divider"],
  ["line", "bg-line"],
  ["ink", "bg-ink"],
  ["muted", "bg-muted"],
  ["brand", "bg-brand"],
  ["brand-soft", "bg-brand-soft"],
  ["brand-strong", "bg-brand-strong"],
  ["assignment", "bg-assignment"],
  ["quiz", "bg-quiz"],
  ["review-dot", "bg-review-dot"],
];

// 오늘이 들어 있는 주의 월요일
function mondayOf(today: string) {
  const day = new Date(`${today}T00:00:00`).getDay();
  return addDays(today, -((day + 6) % 7));
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-[15px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignPreview() {
  const today = useToday();
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "month">("list");
  const [checks, setChecks] = useState({ report: false, quiz: true });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pick, setPick] = useState(0);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  return (
    <AppShell>
      <p className="px-1 text-xs font-medium text-muted">확인용 화면</p>
      <h1 className="px-1 text-[22px] font-bold">우니스 디자인</h1>
      <p className="mt-1 px-1 text-xs text-muted">공통 부품을 모아 둔 곳이에요. 규칙은 docs/DESIGN.md</p>

      <Section title="색">
        <Block className="grid grid-cols-4 gap-3">
          {COLORS.map(([name, className]) => (
            <div key={name} className="flex flex-col items-center gap-1">
              <span className={`h-10 w-10 rounded-full ${className}`} />
              <span className="text-[11px] text-muted">{name}</span>
            </div>
          ))}
        </Block>
      </Section>

      <Section title="글꼴">
        <Block className="space-y-1.5">
          <p className="text-[22px] font-bold">화면 제목 22 / 700</p>
          <p className="text-[15px] font-bold">섹션 제목 15 / 700</p>
          <p className="text-[15px]">본문 15 — 강의계획서 한 장으로 한 학기를 챙겨요</p>
          <p className="text-xs text-muted">보조 12 — 경영정보시스템 · 비마관 304호</p>
          <p className="text-[11px] text-muted">작은 라벨 11</p>
          <p className="font-mono text-[19px] font-semibold text-brand">D-3 · 15:00 · 11/17</p>
        </Block>
      </Section>

      <Section title="블록 · 포인트색은 화면당 하나">
        <div className="grid grid-cols-3 gap-2">
          <div className="flex h-[92px] flex-col justify-between rounded-block-sm bg-brand p-3 text-white">
            <span className="text-[11px] font-medium opacity-80">다음 수업</span>
            <span className="text-[17px] font-bold">회계원리</span>
            <span className="font-mono text-xs">15:00 · 3h 후</span>
          </div>
          <Block className="flex h-[92px] flex-col justify-between !rounded-block-sm !p-3">
            <span className="text-[11px] font-medium text-muted">이번 주 마감</span>
            <span className="font-mono text-[19px] font-semibold text-brand">D-1</span>
            <span className="truncate text-xs text-muted">보고서 외 2건</span>
          </Block>
          <Block className="flex h-[92px] flex-col justify-between !rounded-block-sm !p-3">
            <span className="text-[11px] font-medium text-muted">기말고사</span>
            <span className="font-mono text-[19px] font-semibold">D-24</span>
            <span className="text-xs font-semibold text-brand">시험 대비 →</span>
          </Block>
        </div>
      </Section>

      <Section title="버튼">
        <Block className="flex flex-wrap gap-2">
          <Button>주요 버튼</Button>
          <Button variant="secondary">보조 버튼</Button>
          <Button variant="ghost">글자 버튼</Button>
          <Button disabled>못 누름</Button>
        </Block>
      </Section>

      <Section title="배지">
        <Block className="flex flex-wrap gap-2">
          <Badge kind="assignment" />
          <Badge kind="quiz" />
          <Badge kind="exam" />
          <Badge kind="review" />
        </Block>
      </Section>

      <Section title="요일 줄 + 목록 (한 블록 안, 구분선으로만 나눔)">
        <Block padded={false}>
          <div className="min-h-[70px] border-b border-divider px-2 py-2">
            {today && (
              <WeekStrip
                weekStart={mondayOf(today)}
                today={today}
                selected={selected ?? today}
                markedDates={[today, addDays(today, 1), addDays(today, 3)]}
                onSelect={setSelected}
              />
            )}
          </div>
          <div className="flex items-baseline justify-between px-3.5 pt-3">
            <h3 className="text-[15px] font-bold">오늘 일정</h3>
            <span className="text-xs text-muted">4개 중 1개 지남</span>
          </div>
          <div className="divide-y divide-divider">
            <CheckRow time="09:00" title="경영통계" sub="새빛관 201호" past />
            <div className="flex items-center gap-2 px-3.5">
              <span className="h-px flex-1 bg-brand" />
              <span className="font-mono text-[11px] font-semibold text-brand">11:24</span>
            </div>
            <div className="p-3.5">
              <div className="rounded-callout bg-brand-soft p-3.5">
                <p className="text-xs font-semibold text-brand">빈 시간 2시간 30분 · 이거 하기 좋아요</p>
                <p className="mt-1 text-[15px] font-bold">마케팅원론 보고서</p>
                <p className="font-mono text-xs text-muted">D-1</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" className="flex-1 !bg-surface">다른 일</Button>
                  <Button className="flex-1">시작</Button>
                </div>
              </div>
            </div>
            <CheckRow
              time="15:00"
              title="마케팅원론 보고서"
              sub="마케팅원론"
              right={
                <Checkbox
                  checked={checks.report}
                  onChange={(v) => setChecks({ ...checks, report: v })}
                  label="마케팅원론 보고서 완료"
                />
              }
            />
            <CheckRow
              checked={checks.quiz}
              onCheckedChange={(v) => setChecks({ ...checks, quiz: v })}
              title="회계원리 퀴즈 3"
              sub="체크박스가 왼쪽에 있는 줄"
              right={<Badge kind="quiz" />}
            />
            <CheckRow time="11/12" title="11월 둘째 주 조별 발표" sub="계획서 원문 그대로" right={<Badge kind="review" />} />
          </div>
        </Block>
      </Section>

      <Section title="전환 탭">
        <Block className="flex items-center justify-between">
          <span className="text-sm text-muted">지금: {view === "list" ? "목록" : "달력"}</span>
          <SegmentedTabs
            label="보기 방식"
            options={[
              { value: "list", label: "목록" },
              { value: "month", label: "달력" },
            ]}
            value={view}
            onChange={setView}
          />
        </Block>
      </Section>

      <Section title="아래에서 올라오는 창">
        <Block>
          <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(true)}>
            날짜 고르기 창 열기
          </Button>
        </Block>
      </Section>

      <BottomSheet open={sheetOpen} onClose={closeSheet} title="11월 둘째 주 조별 발표">
        <Badge kind="review" />
        <p className="mt-2 text-sm text-muted">계획서 원문: 11월 둘째 주 조별 발표</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {["11/10", "11/12", "11/14"].map((d, i) => (
            <button
              key={d}
              type="button"
              aria-pressed={pick === i}
              onClick={() => setPick(i)}
              className={`flex min-h-14 flex-col items-center justify-center rounded-button ${
                pick === i ? "bg-brand text-white" : "bg-canvas text-ink"
              }`}
            >
              <span className="font-mono text-[17px] font-semibold">{d}</span>
              <span className="text-[11px] opacity-80">{["월", "수", "금"][i]}요일</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={closeSheet}>빼기</Button>
          <Button className="flex-[2]" onClick={closeSheet}>
            <span>
              <span className="font-mono">{["11/10", "11/12", "11/14"][pick]}</span>로 저장
            </span>
          </Button>
        </div>
      </BottomSheet>
    </AppShell>
  );
}
