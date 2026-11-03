import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";
import Button from "@/components/ui/button";

// 마이페이지 기본 화면. Google 로그인(⑪)이 붙으면 아래 버튼을 실제 로그인으로 바꾼다.
export default function MyPage() {
  return (
    <AppShell>
      <h1 className="px-1 text-[22px] font-bold">마이페이지</h1>

      <Block className="mt-4">
        <h2 className="text-[15px] font-bold">로그인</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          Google 로그인을 준비하고 있어요. 로그인하지 않아도 모든 기능을 그대로 쓸 수 있어요.
        </p>
        <Button disabled className="mt-3 w-full">
          Google로 로그인 (준비 중)
        </Button>
      </Block>
    </AppShell>
  );
}
