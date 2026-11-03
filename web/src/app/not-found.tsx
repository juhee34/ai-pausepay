import Link from "next/link";
import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";

// 없는 주소로 들어왔을 때의 화면.
export default function NotFound() {
  return (
    <AppShell>
      <Block className="mt-10 text-center">
        <h1 className="text-[17px] font-bold">찾는 화면이 없어요</h1>
        <p className="mt-1 text-[13px] text-muted">주소가 바뀌었거나 아직 없는 화면이에요.</p>
        <Link
          href="/"
          className="mt-4 flex min-h-11 items-center justify-center rounded-button bg-brand px-4 text-[15px] font-semibold text-white active:bg-brand-strong"
        >
          홈으로 가기
        </Link>
      </Block>
    </AppShell>
  );
}
