import { ChevronLeft } from "lucide-react";
import Link from "next/link";

// 화면 맨 위 '‹ 오늘' 같은 뒤로 가기. 기능 화면은 들어온 탭으로 돌아간다:
// 학교 기능 → 오늘, 강의계획서·시간표 올리기 → 일정, 취업 준비 기능 → 취업. 탭 첫 화면(오늘·일정·취업·내 정보)에는 넣지 않는다.
export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="-ml-1.5 flex min-h-11 w-fit items-center pr-2 text-[15px] font-medium text-brand">
      <ChevronLeft size={22} strokeWidth={2} aria-hidden="true" />
      {label}
    </Link>
  );
}
