"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 모든 화면 아래에 고정되는 탭바. 아이콘은 패키지 없이 간단한 선 그림(SVG)으로 그린다.
const TABS = [
  { href: "/", label: "홈", icon: "M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
  { href: "/calendar", label: "캘린더", icon: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" },
  { href: "/exam", label: "시험 대비", icon: "M6 3h9l3 3v15H6zM9 11h6M9 15h6M9 7h3" },
  { href: "/mail", label: "메일", icon: "M3 6h18v12H3zM3 7l9 6 9-6" },
];

export default function TabBar() {
  const pathname = usePathname();
  // /design은 새 탭바(components/ui/bottom-tab-bar)를 보여 주므로 옛 탭바는 숨긴다
  if (pathname.startsWith("/design")) return null;

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-foreground/10 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${
                  active ? "text-accent" : "text-foreground/45"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2.2 : 1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={tab.icon} />
                </svg>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
