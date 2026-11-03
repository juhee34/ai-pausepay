import type { Metadata } from "next";
import DesignPreview from "./design-preview";

export const metadata: Metadata = {
  title: "디자인 확인 · 우니스",
  robots: { index: false },
};

// 공통 부품(components/ui)을 모아 보는 확인용 화면. 사용자 메뉴에는 넣지 않는다.
export default function DesignPage() {
  return <DesignPreview />;
}
