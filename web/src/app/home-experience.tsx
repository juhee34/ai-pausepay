"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, ChartNoAxesCombined, LayoutGrid, ShieldCheck } from "lucide-react";
import BottomSheet from "@/components/ui/bottom-sheet";
import Button from "@/components/ui/button";
import { finishOnboarding, useOnboardingSeen } from "@/lib/onboarding";

const STEPS = [
  { Icon: CalendarDays, eyebrow: "01 / 일정을 모아요", title: "강의계획서 한 장으로 시작해요", body: "홈의 ‘강의계획서로 일정 추가’를 눌러 PDF나 KLAS 캡처를 올려 보세요. AI가 찾은 날짜와 평가 비율은 직접 확인하고 수정한 뒤 저장해요.", example: "강의계획서 → 날짜 확인 → 내 달력", target: "home-overview" },
  { Icon: ChartNoAxesCombined, eyebrow: "02 / 오늘 할 일을 정해요", title: "남은 두 시간, 어디에 쓸까요?", body: "아래 ‘우선순위’에서 오늘 쓸 수 있는 시간을 골라 보세요. 배점·마감·예상 시간을 바탕으로 할 일을 추천해요. ‘기말 필요 점수’에서는 목표까지 필요한 점수를 확인해요.", example: "쓸 수 있는 시간 → 우선순위 → 집중 시작", target: "main-navigation" },
  { Icon: LayoutGrid, eyebrow: "03 / 필요한 도구를 꺼내요", title: "가운데 ＋는 전체 기능이에요", body: "시험 대비, 교수님 메일, 집중 모드와 취업 준비 도구를 한곳에서 찾을 수 있어요. 취업 탭에서는 대외활동을 관리하고, 끝난 경험을 스펙 영수증으로 남겨요.", example: "학업 · 취업 준비 · 내 기록", target: "main-navigation" },
  { Icon: ShieldCheck, eyebrow: "04 / 내 기록을 지켜요", title: "로그인 없이도 바로 시작해요", body: "기록은 기본적으로 이 브라우저에 남아요. 마이페이지에서 선택적으로 로그인하고 계정에 백업할 수 있어요. 브라우저 데이터를 지우기 전에는 꼭 백업해 주세요.", example: "안내는 홈 메뉴에서 언제든 다시 볼 수 있어요", target: "main-navigation" },
];

export default function HomeExperience({ children }: { children: ReactNode }) {
  const seen = useOnboardingSeen();
  const params = useSearchParams();
  const router = useRouter();
  const tour = params.get("tour") === "1";
  const [step, setStep] = useState(0);
  const open = tour;
  const current = STEPS[step];
  useEffect(() => {
    if (seen === false && !tour) router.replace("/welcome");
  }, [seen, tour, router]);
  useEffect(() => {
    if (!open) return;
    const target = document.getElementById(current.target);
    target?.classList.add("tour-target");
    return () => target?.classList.remove("tour-target");
  }, [open, current.target]);
  function finish() {
    finishOnboarding();
    setStep(0);
    router.replace("/", { scroll: false });
  }
  if (seen === null || (seen === false && !tour)) return <p className="p-8 text-center text-sm text-muted" role="status">우니스를 준비하고 있어요…</p>;
  return <>
    {children}
    <BottomSheet open={open} onClose={finish} title="우니스 사용 안내">
      <div className="mb-5 flex gap-1.5" aria-label={`안내 ${step + 1} / ${STEPS.length}`}>
        {STEPS.map((_, index) => <span key={index} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-brand" : "bg-divider"}`} />)}
      </div>
      <div aria-live="polite" aria-atomic="true" className="min-h-[230px]">
        <current.Icon size={30} className="mb-4 text-brand" strokeWidth={1.5} aria-hidden="true" />
        <p className="text-xs font-semibold text-brand">{current.eyebrow}</p>
        <h3 className="mt-2 text-[24px] leading-snug font-bold tracking-tight">{current.title}</h3>
        <p className="mt-3 text-sm leading-7 text-muted">{current.body}</p>
        <p className="my-4 rounded-callout bg-brand-soft p-3 text-xs leading-6 font-medium text-brand">{current.example}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>이전</Button>
        <Button className="flex-1" onClick={() => step === STEPS.length - 1 ? finish() : setStep(step + 1)}>{step === STEPS.length - 1 ? "내 하루 시작하기" : "다음"}<ArrowRight size={16} aria-hidden="true" /></Button>
      </div>
      <button type="button" onClick={finish} className="mt-1 min-h-11 w-full text-xs text-muted">안내 건너뛰기</button>
    </BottomSheet>
  </>;
}
