"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Award,
  BriefcaseBusiness,
  CalendarPlus,
  Calculator,
  CalendarClock,
  Cookie,
  House,
  Mail,
  Map as MapIcon,
  NotebookPen,
  Plus,
  Radar,
  ScrollText,
  Sparkles,
  Timer,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { DAILY_AI_LIMIT } from "@/lib/ai-usage";
import { COOKIES_PER_AI_USE } from "@/lib/cookies";
import BottomSheet from "./bottom-sheet";

const LEFT_TABS = [
  { href: "/", label: "홈", Icon: House },
  { href: "/today", label: "우선순위", Icon: Sparkles },
];
const RIGHT_TABS = [
  { href: "/career", label: "취업", Icon: BriefcaseBusiness },
  { href: "/my", label: "마이페이지", Icon: UserRound },
];

type FeatureTile = {
  href: string;
  label: string;
  sub: string;
  Icon: LucideIcon;
  ready: boolean;
  cookie?: boolean; // AI를 써서 무료 횟수 뒤에 쿠키가 필요한 기능
};

// 가운데 + 를 누르면 나오는 전체 기능 창. 새 기능은 탭을 늘리지 않고 여기에 더한다.
// 화면이 생기면 그 타일의 ready를 true로 바꾼다.
const FEATURE_GROUPS: { title: string; tiles: FeatureTile[] }[] = [
  {
    title: "학교",
    tiles: [
      { href: "/grades", label: "기말 필요 점수", sub: "목표까지 몇 점?", Icon: Calculator, ready: true },
      { href: "/risk", label: "학기 리스크 지도", sub: "몰리는 주 미리 보기", Icon: MapIcon, ready: true },
      { href: "/exam", label: "시험 대비", sub: "강의자료로 요약과 문제", Icon: NotebookPen, ready: true, cookie: true },
      { href: "/mail", label: "교수님 메일", sub: "예의 바른 메일 초안", Icon: Mail, ready: true, cookie: true },
      { href: "/focus", label: "집중 모드", sub: "30분 단위로 집중", Icon: Timer, ready: true },
      { href: "/report", label: "학기 결산서", sub: "시간과 학점 돌아보기", Icon: ScrollText, ready: true },
    ],
  },
  {
    title: "취업 준비",
    tiles: [
      { href: "/calendar?type=posting", label: "공고·자격증 올리기", sub: "마감을 일정에 추가", Icon: CalendarPlus, ready: true, cookie: true },
      { href: "/career/receipts", label: "스펙 영수증", sub: "경험을 한 줄로 정리", Icon: Award, ready: true, cookie: true },
      { href: "/career/skills", label: "역량 공백 지도", sub: "부족한 역량 찾기", Icon: Radar, ready: true },
    ],
  },
  {
    title: "내 정보",
    tiles: [
      { href: "/timetable", label: "시간표 캡쳐", sub: "캡쳐로 시간표 넣기", Icon: CalendarClock, ready: true, cookie: true },
    ],
  },
];

const TILE_CLASS =
  "flex h-full min-h-16 w-full items-start gap-2.5 rounded-[14px] bg-canvas p-3 text-left active:bg-divider";

// 화면 아래에 고정되는 탭바 5칸. 가운데 + 는 전체 기능 창을 연다.
export default function BottomTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [soonHref, setSoonHref] = useState<string | null>(null);

  function closeMore() {
    setMoreOpen(false);
    setSoonHref(null);
  }

  const tab = ({ href, label, Icon }: (typeof LEFT_TABS)[number]) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <li key={href} className="flex-1">
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={`flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
            active ? "text-brand" : "text-muted"
          }`}
        >
          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
          {label}
        </Link>
      </li>
    );
  };

  const tileBody = ({ href, label, sub, Icon, ready, cookie }: FeatureTile) => (
    <>
      <Icon size={22} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">
          {label}
          {cookie && (
            <>
              <Cookie size={13} strokeWidth={2} aria-hidden="true" className="ml-1 inline-block align-[-1px] text-brand" />
              <span className="sr-only">무료 횟수 뒤에 쿠키 필요</span>
            </>
          )}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted">
          {soonHref === href ? "곧 열려요" : sub}
        </span>
        {!ready && (
          <span className="mt-1 inline-block rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-muted">
            준비 중
          </span>
        )}
      </span>
    </>
  );

  return (
    <>
      <nav
        aria-label="주요 메뉴"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] print:hidden"
      >
        <ul className="mx-auto flex h-16 max-w-[480px] items-center">
          {LEFT_TABS.map(tab)}
          <li className="flex flex-1 justify-center">
            <button
              type="button"
              aria-label="전체 기능"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white active:bg-brand-strong"
            >
              <Plus size={24} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </li>
          {RIGHT_TABS.map(tab)}
        </ul>
      </nav>

      {/* nav 밖에 두어야 창이 탭바를 덮는다 */}
      <BottomSheet open={moreOpen} onClose={closeMore} title="전체 기능">
        <p className="-mt-1 mb-3 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
          <Cookie size={14} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
          <span>
            이 표시가 있는 기능은 한 번에 쿠키 {COOKIES_PER_AI_USE}개를 써요. 매일 무료 쿠키 {DAILY_AI_LIMIT}개로 시작해요.
          </span>
        </p>
        <div className="space-y-4">
          {FEATURE_GROUPS.map(({ title, tiles }) => (
            <section key={title}>
              <h3 className="mb-2 text-[11px] font-semibold text-muted">{title}</h3>
              <ul className="grid grid-cols-2 gap-2">
                {tiles.map((tile) => (
                  <li key={tile.href}>
                    {tile.ready ? (
                      <Link href={tile.href} onClick={closeMore} className={TILE_CLASS}>
                        {tileBody(tile)}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSoonHref(tile.href)}
                        className={`${TILE_CLASS} opacity-70`}
                      >
                        {tileBody(tile)}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p role="status" className="sr-only">
          {soonHref && "곧 열려요"}
        </p>
      </BottomSheet>
    </>
  );
}
