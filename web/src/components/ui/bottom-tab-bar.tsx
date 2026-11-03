"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  House,
  Mail,
  NotebookPen,
  Plus,
  Timer,
} from "lucide-react";
import BottomSheet from "./bottom-sheet";

const LEFT_TABS = [
  { href: "/", label: "홈", Icon: House },
  { href: "/calendar", label: "일정", Icon: CalendarDays },
];
const RIGHT_TABS = [
  { href: "/exam", label: "시험 대비", Icon: NotebookPen },
  { href: "/mail", label: "메일", Icon: Mail },
];

// 가운데 + 를 누르면 나오는 메뉴. 새 기능은 탭을 늘리지 않고 여기에 더한다.
const MORE_ITEMS = [
  { href: "/focus", label: "집중 모드", sub: "25분 집중 + 5분 휴식", Icon: Timer },
];

// 화면 아래에 고정되는 탭바 5칸. 가운데 + 는 더보기 메뉴를 연다.
export default function BottomTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

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

  return (
    <>
      <nav
        aria-label="주요 메뉴"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto flex h-16 max-w-[480px] items-center">
          {LEFT_TABS.map(tab)}
          <li className="flex flex-1 justify-center">
            <button
              type="button"
              aria-label="더보기"
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
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="더보기">
        <ul className="space-y-2">
          {MORE_ITEMS.map(({ href, label, sub, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setMoreOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-button bg-canvas px-4 py-2.5 active:bg-divider"
              >
                <Icon size={20} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{label}</span>
                  <span className="block text-xs text-muted">{sub}</span>
                </span>
                <ChevronRight
                  size={18}
                  strokeWidth={1.8}
                  aria-hidden="true"
                  className="shrink-0"
                />
              </Link>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </>
  );
}
