import { ChevronLeft } from "lucide-react";
import Link from "next/link";

// 화면 맨 위 '‹ 홈' 같은 뒤로 가기. 기능 화면은 들어온 탭으로 돌아간다:
// 학교 기능·내 정보 → 홈, 취업 준비 기능 → 취업. 탭 첫 화면(홈·우선순위·취업·마이페이지)에는 넣지 않는다.
export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="-ml-1 flex min-h-11 w-fit items-center gap-0.5 pr-2 text-xs font-semibold text-brand">
      <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
      {label}
    </Link>
  );
}
