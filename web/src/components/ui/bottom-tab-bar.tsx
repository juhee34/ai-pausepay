"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, Mail, NotebookPen, Plus } from "lucide-react";

const LEFT_TABS = [
  { href: "/", label: "홈", Icon: House },
  { href: "/calendar", label: "일정", Icon: CalendarDays },
];
const RIGHT_TABS = [
  { href: "/exam", label: "시험 대비", Icon: NotebookPen },
  { href: "/mail", label: "메일", Icon: Mail },
];

// 화면 아래에 고정되는 탭바 5칸. 가운데 + 는 강의계획서·KLAS 캡쳐 올리기.
// 올리기 화면이 생기기 전까지 + 는 일정(/calendar)으로 보낸다.
export default function BottomTabBar() {
  const pathname = usePathname();

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
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex h-16 max-w-[480px] items-center">
        {LEFT_TABS.map(tab)}
        <li className="flex flex-1 justify-center">
          <Link
            href="/calendar"
            aria-label="강의계획서·캡쳐 올리기"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white active:bg-brand-strong"
          >
            <Plus size={24} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </li>
        {RIGHT_TABS.map(tab)}
      </ul>
    </nav>
  );
}
