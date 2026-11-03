import type { ReactNode } from "react";
import BottomTabBar from "./bottom-tab-bar";

// 모든 화면의 틀: 회색 바탕, 가운데 최대 폭 480px, 좌우 여백 16px, 하단 탭바.
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 text-ink">
      {/* 바탕색을 화면 끝까지 칠한다 (layout.tsx의 body 아래 여백까지 덮도록) */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-canvas" />
      {/* 아래 여백은 고정된 탭바가 마지막 내용을 가리지 않게 한다 */}
      <main className="mx-auto w-full max-w-[480px] px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
